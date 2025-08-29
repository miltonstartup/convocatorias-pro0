// Edge Function: manage-saved-convocatorias (NUEVA VERSION UNIFICADA)
// Gestiona el guardado y carga de convocatorias del usuario
// CORREGIDO: Compatible con las llamadas del frontend, sin imports externos

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
        console.log('💾 [MANAGE-SAVED-CONVOCATORIAS] Iniciando gestión...');
        
        // Obtener credenciales de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Configuración de Supabase no disponible');
        }

        // Verificar autenticación
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Token de autorización requerido');
        }

        const jwt = authHeader.replace('Bearer ', '');
        console.log('🔐 Verificando autenticación...');

        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'apikey': supabaseServiceKey
            }
        });

        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error('❌ Error de autenticación:', errorText);
            throw new Error('Usuario no autenticado');
        }

        const userData = await userResponse.json();
        const userId = userData.id;
        console.log('👤 Usuario autenticado:', userId);

        if (req.method === 'POST') {
            // Guardar convocatoria
            console.log('💾 Guardando convocatoria...');
            const requestData = await req.json();
            
            console.log('📥 Datos recibidos:', JSON.stringify(requestData, null, 2));
            
            // Verificar si es una acción específica o guardado directo
            if (requestData.action === 'save_convocatoria') {
                // Guardado desde resultados de búsqueda IA
                const {
                    title,
                    description,
                    organization,
                    amount,
                    deadline,
                    requirements,
                    source_url,
                    category,
                    tags,
                    from_ai_search,
                    ai_search_id
                } = requestData;

                if (!title) {
                    throw new Error('Título es requerido para guardar convocatoria');
                }

                // Verificar si ya existe esta convocatoria
                console.log('🔍 Verificando convocatoria duplicada...');
                const checkResponse = await fetch(`${supabaseUrl}/rest/v1/saved_convocatorias?user_id=eq.${userId}&title=eq.${encodeURIComponent(title)}`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (checkResponse.ok) {
                    const existing = await checkResponse.json();
                    if (existing.length > 0) {
                        console.log('⚠️ Convocatoria ya guardada');
                        return new Response(
                            JSON.stringify({ 
                                data: {
                                    already_saved: true,
                                    existing_id: existing[0].id,
                                    message: 'Esta convocatoria ya está guardada'
                                }
                            }),
                            {
                                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                            }
                        );
                    }
                }

                // Insertar nueva convocatoria
                const insertData = {
                    user_id: userId,
                    title: title,
                    description: description || null,
                    organization: organization || null,
                    deadline: deadline || null,
                    amount: amount || null,
                    requirements: requirements || null,
                    source_url: source_url || null,
                    tags: tags || [],
                    notes: category ? `Categoría: ${category}` : null,
                    ai_search_result_id: from_ai_search ? ai_search_id : null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                console.log('💾 Insertando convocatoria:', insertData);

                const insertResponse = await fetch(`${supabaseUrl}/rest/v1/saved_convocatorias`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(insertData)
                });

                if (!insertResponse.ok) {
                    const errorText = await insertResponse.text();
                    console.error('❌ Error insertando convocatoria:', errorText);
                    throw new Error('Error al guardar convocatoria: ' + errorText);
                }

                const savedData = await insertResponse.json();
                console.log('✅ Convocatoria guardada exitosamente');

                return new Response(
                    JSON.stringify({ 
                        data: {
                            success: true,
                            saved_convocatoria: savedData[0],
                            message: 'Convocatoria guardada exitosamente',
                            from_ai_search: from_ai_search
                        }
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    }
                );

            } else {
                // Guardado directo con convocatoriaData
                const convocatoriaData = requestData.convocatoriaData || requestData;
                
                if (!convocatoriaData || !convocatoriaData.title) {
                    throw new Error('Datos de convocatoria requeridos (título obligatorio)');
                }

                const insertData = {
                    user_id: userId,
                    title: convocatoriaData.title,
                    description: convocatoriaData.description || null,
                    organization: convocatoriaData.organization || null,
                    deadline: convocatoriaData.deadline || null,
                    amount: convocatoriaData.amount || null,
                    requirements: convocatoriaData.requirements || null,
                    source_url: convocatoriaData.source_url || null,
                    tags: convocatoriaData.tags || [],
                    notes: convocatoriaData.notes || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const insertResponse = await fetch(`${supabaseUrl}/rest/v1/saved_convocatorias`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(insertData)
                });

                if (!insertResponse.ok) {
                    const errorText = await insertResponse.text();
                    throw new Error('Error al guardar convocatoria: ' + errorText);
                }

                const savedData = await insertResponse.json();
                console.log('✅ Convocatoria guardada exitosamente');

                return new Response(
                    JSON.stringify({ 
                        data: savedData[0], 
                        message: 'Convocatoria guardada exitosamente'
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    }
                );
            }

        } else if (req.method === 'GET') {
            // Cargar convocatorias guardadas
            console.log('📋 Cargando convocatorias guardadas...');
            
            const loadResponse = await fetch(`${supabaseUrl}/rest/v1/saved_convocatorias?user_id=eq.${userId}&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!loadResponse.ok) {
                const errorText = await loadResponse.text();
                console.error('❌ Error cargando convocatorias:', errorText);
                
                // Si es error 406 (tabla no existe), retornar array vacío
                if (loadResponse.status === 406) {
                    console.log('📋 Tabla no existe, retornando lista vacía');
                    return new Response(
                        JSON.stringify({ 
                            data: [],
                            total_count: 0,
                            user_id: userId 
                        }),
                        {
                            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        }
                    );
                }
                
                throw new Error('Error al cargar las convocatorias: ' + errorText);
            }

            const convocatorias = await loadResponse.json();
            console.log(`✅ Cargadas ${convocatorias.length} convocatorias`);

            return new Response(
                JSON.stringify({ 
                    data: convocatorias,
                    total_count: convocatorias.length,
                    user_id: userId 
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );

        } else {
            throw new Error(`Método ${req.method} no soportado`);
        }

    } catch (error) {
        console.error('❌ ERROR CRÍTICO en manage-saved-convocatorias:', error);
        console.error('❌ Stack trace:', error.stack);
        
        return new Response(
            JSON.stringify({ 
                error: {
                    code: 'SAVED_CONVOCATORIAS_ERROR',
                    message: error.message,
                    details: error.stack,
                    timestamp: new Date().toISOString()
                }
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});