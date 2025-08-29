// Edge Function: manage-ai-config-v2
// VERSIÓN FINAL CORREGIDA para gestión de configuración de IA
// CORRIGIDO: Manejo robusto de errores y respuestas consistentes

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
        console.log('🤖 [MANAGE-AI-CONFIG-V2] Iniciando gestión de configuración IA...');
        
        // Obtener credenciales de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Configuración de Supabase no disponible');
        }

        // Obtener y verificar token de autorización
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Token de autorización requerido');
        }

        const jwt = authHeader.replace('Bearer ', '');
        console.log('🔐 Verificando autenticación...');

        // Verificar usuario autenticado
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

        if (req.method === 'GET') {
            // Obtener configuración de modelos del usuario
            console.log(`📋 Obteniendo configuración para usuario: ${userId}`);

            try {
                const configResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (!configResponse.ok) {
                    const errorText = await configResponse.text();
                    console.error('❌ Error obteniendo configuración:', errorText);
                    
                    // Si la tabla no existe o no tiene datos, retornar configuración por defecto
                    console.log('📋 Retornando configuración por defecto');
                    return new Response(JSON.stringify({
                        data: {
                            configs: [],
                            user_id: userId,
                            message: 'No hay configuración guardada, usando valores por defecto'
                        }
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                const configs = await configResponse.json();
                console.log(`✅ Configuraciones encontradas: ${configs.length}`);

                return new Response(JSON.stringify({
                    data: {
                        configs,
                        user_id: userId,
                        total_models: configs.length
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
                
            } catch (error) {
                console.error('❌ Error procesando GET:', error);
                throw new Error('Error obteniendo configuración: ' + error.message);
            }

        } else if (req.method === 'POST') {
            // Guardar/actualizar configuración de modelos
            const requestData = await req.json();
            console.log('📥 Datos recibidos:', requestData);
            
            const { models } = requestData;

            if (!models || !Array.isArray(models)) {
                throw new Error('Lista de modelos requerida y debe ser un array');
            }

            console.log(`💾 Guardando configuración para usuario: ${userId}, modelos: ${models.length}`);

            try {
                // Eliminar configuración existente
                console.log('🗑️ Eliminando configuración existente...');
                const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (!deleteResponse.ok) {
                    console.log('⚠️ No se pudo eliminar configuración existente (puede no existir)');
                }

                // Validar y preparar nueva configuración
                const configsToInsert = models
                    .filter(model => model && (model.id || model.model_name)) // Filtrar modelos válidos
                    .map(model => ({
                        user_id: userId,
                        model_name: model.id || model.model_name,
                        enabled: Boolean(model.enabled)
                    }));

                if (configsToInsert.length === 0) {
                    throw new Error('No se proporcionaron modelos válidos');
                }

                console.log(`📝 Insertando ${configsToInsert.length} configuraciones...`);

                // Insertar nueva configuración
                const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(configsToInsert)
                });

                if (!insertResponse.ok) {
                    const errorText = await insertResponse.text();
                    console.error('❌ Error insertando configuración:', errorText);
                    throw new Error(`Error al guardar configuración: ${errorText}`);
                }

                const savedConfigs = await insertResponse.json();
                console.log(`✅ Configuración guardada exitosamente: ${savedConfigs.length} modelos`);

                return new Response(JSON.stringify({
                    data: {
                        success: true,
                        configs: savedConfigs,
                        saved_count: savedConfigs.length,
                        message: `Configuración guardada exitosamente: ${savedConfigs.length} modelos`,
                        user_id: userId,
                        timestamp: new Date().toISOString()
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
                
            } catch (error) {
                console.error('❌ Error procesando POST:', error);
                throw new Error('Error guardando configuración: ' + error.message);
            }

        } else {
            throw new Error(`Método ${req.method} no soportado`);
        }

    } catch (error) {
        console.error('❌ ERROR CRÍTICO en manage-ai-config-v2:', error);
        console.error('❌ Stack trace:', error.stack);

        const errorResponse = {
            error: {
                code: 'AI_CONFIG_ERROR',
                message: error.message,
                details: error.stack,
                timestamp: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});