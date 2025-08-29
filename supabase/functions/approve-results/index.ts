Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('🔍 Iniciando procesamiento de aprobación...');
        
        // Extraer parámetros de la solicitud
        const requestData = await req.json();
        console.log('🔍 Datos recibidos:', JSON.stringify(requestData, null, 2));
        
        const { result_ids, add_to_calendar = false, approved = true } = requestData;
        const approval_action = approved !== false ? 'approve' : 'reject';

        if (!result_ids || !Array.isArray(result_ids) || result_ids.length === 0) {
            throw new Error('Se requiere al menos un ID de resultado');
        }
        
        console.log('🔍 Parámetros procesados:', { result_ids, add_to_calendar, approval_action });

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Verificar autenticación del usuario
        let userId = '6f4df286-8b1e-4ac2-9d4b-de7177f17573'; // Usuario por defecto válido para testing
        const authHeader = req.headers.get('authorization');
        
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');

                // Verificar token y obtener usuario
                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userId = userData.id;
                    console.log('👤 Usuario autenticado:', userId);
                } else {
                    console.warn('⚠️ Token inválido, usando usuario por defecto para testing');
                }
            } catch (authError) {
                console.warn('⚠️ Error de autenticación, usando usuario por defecto para testing');
            }
        } else {
            console.log('🛠️ Modo testing sin autenticación');
        }

        // Obtener los resultados que el usuario quiere aprobar/rechazar
        // Usar queries individuales para mayor compatibilidad
        const results = [];
        for (const resultId of result_ids) {
            const singleResultResponse = await fetch(`${supabaseUrl}/rest/v1/ai_search_results?id=eq.${resultId}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (singleResultResponse.ok) {
                const singleResult = await singleResultResponse.json();
                if (singleResult.length > 0) {
                    results.push(singleResult[0]);
                }
            }
        }

        console.log('🔍 Resultados obtenidos:', results.length);

        if (results.length === 0) {
            throw new Error('No se encontraron resultados válidos');
        }

        // Verificar que los resultados pertenecen a búsquedas del usuario
        const searchIds = [...new Set(results.map((r: any) => r.search_id))];
        const userSearches = [];
        
        for (const searchId of searchIds) {
            const searchResponse = await fetch(`${supabaseUrl}/rest/v1/ai_searches?id=eq.${searchId}&user_id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (searchResponse.ok) {
                const searchResult = await searchResponse.json();
                userSearches.push(...searchResult);
            }
        }
        
        console.log('🔍 Búsquedas del usuario encontradas:', userSearches.length);
        
        const userSearchIds = new Set(userSearches.map((s: any) => s.id));

        // Filtrar solo resultados que pertenecen al usuario
        const validResults = results.filter((result: any) => userSearchIds.has(result.search_id));

        if (validResults.length === 0) {
            throw new Error('No tienes permisos para modificar estos resultados');
        }
        
        console.log('🔍 Resultados válidos para el usuario:', validResults.length);

        // Actualizar estado de aprobación de cada resultado individualmente
        const updateData: any = {
            approved_by_user: approval_action === 'approve'
        };

        if (add_to_calendar && approval_action === 'approve') {
            updateData.added_to_calendar = true;
        }
        
        console.log('🔍 Datos de actualización:', updateData);

        const updatedResults = [];
        for (const result of validResults) {
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/ai_search_results?id=eq.${result.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            if (updateResponse.ok) {
                const updated = await updateResponse.json();
                updatedResults.push(...updated);
                console.log(`✅ Actualizado resultado: ${result.id}`);
            } else {
                const errorText = await updateResponse.text();
                console.error(`❌ Error actualizando ${result.id}:`, errorText);
            }
        }
        
        console.log('🔍 Total resultados actualizados:', updatedResults.length);

        // Si se solicitó añadir al calendario, procesar cada resultado aprobado
        let calendarEntries = [];
        if (add_to_calendar && approval_action === 'approve') {
            for (const result of validResults) {
                if (result.deadline) {
                    // Mapear resultado de búsqueda IA a estructura de convocatorias
                    const calendarEntry = {
                        user_id: userId,
                        nombre_concurso: result.title,
                        institucion: result.validated_data?.organization || 'Organización no especificada',
                        fecha_cierre: new Date(result.deadline + 'T23:59:59Z').toISOString(),
                        estado: 'pendiente',
                        monto_financiamiento: result.amount || null,
                        requisitos: result.requirements || null,
                        descripcion: result.description || null,
                        sitio_web: result.source_url || null,
                        fuente: 'Búsqueda IA Pro',
                        tags: result.validated_data?.tags || [],
                        confidence_score: result.validated_data?.reliability_score ? result.validated_data.reliability_score / 100 : null,
                        ai_processed: true
                    };

                    // Insertar en tabla de convocatorias
                    const calendarResponse = await fetch(`${supabaseUrl}/rest/v1/convocatorias`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(calendarEntry)
                    });

                    if (calendarResponse.ok) {
                        const responseText = await calendarResponse.text();
                        let savedEntry;
                        
                        if (responseText.trim()) {
                            try {
                                savedEntry = JSON.parse(responseText);
                                calendarEntries.push(savedEntry);
                            } catch (parseError) {
                                console.warn('Respuesta no es JSON válido, pero inserción fue exitosa');
                                // Crear entrada mock para el response
                                savedEntry = { id: 'created', title: result.title };
                                calendarEntries.push(savedEntry);
                            }
                        } else {
                            console.warn('Respuesta vacía, pero inserción fue exitosa');
                            // Crear entrada mock para el response
                            savedEntry = { id: 'created', title: result.title };
                            calendarEntries.push(savedEntry);
                        }
                        
                        console.log('Convocatoria añadida al calendario:', result.title);
                    } else {
                        const errorText = await calendarResponse.text();
                        console.error('Error al añadir al calendario:', errorText);
                    }
                }
            }
        }

        const actionMessage = approval_action === 'approve' 
            ? `${validResults.length} resultado(s) aprobado(s) exitosamente`
            : `${validResults.length} resultado(s) rechazado(s) exitosamente`;

        console.log('✅ Aprobación completada exitosamente:', {
            processed_count: validResults.length,
            calendar_entries_count: calendarEntries.length,
            action: approval_action
        });

        return new Response(JSON.stringify({
            data: {
                updated_results: updatedResults,
                calendar_entries: calendarEntries,
                calendar_entries_count: calendarEntries.length,
                processed_count: validResults.length,
                message: actionMessage
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ Error al procesar aprobación:', error);
        console.error('❌ Stack trace:', error.stack);

        const errorResponse = {
            error: {
                code: 'APPROVE_RESULTS_ERROR',
                message: error.message,
                details: error.stack
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
