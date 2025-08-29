// Edge Function: ai-config-manager (NUEVA VERSION CORREGIDA)
// Gestiona la configuración de modelos de IA del usuario
// CORREGIDO: Sin imports externos, usando solo APIs nativas de Deno

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
        console.log('🤖 [AI-CONFIG-MANAGER] Iniciando gestión de configuración IA...');
        
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

        if (req.method === 'GET') {
            // Obtener configuración de modelos del usuario
            console.log(`📋 Obteniendo configuración para usuario: ${userId}`);

            try {
                // Obtener configuración de modelos
                const modelsResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    }
                });

                // Obtener claves API
                const keysResponse = await fetch(`${supabaseUrl}/rest/v1/user_api_keys?user_id=eq.${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    }
                });

                const configs = modelsResponse.ok ? await modelsResponse.json() : [];
                const apiKeys = keysResponse.ok ? await keysResponse.json() : [];
                const userKeys = apiKeys[0] || {};

                console.log(`✅ Configuraciones encontradas: ${configs.length}`);

                return new Response(JSON.stringify({
                    data: {
                        configs,
                        user_id: userId,
                        total_models: configs.length,
                        api_keys_status: {
                            has_google_key: Boolean(userKeys.google_api_key),
                            has_openrouter_key: Boolean(userKeys.openrouter_api_key)
                        },
                        message: configs.length > 0 ? 'Configuración cargada' : 'No hay configuración guardada'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
                
            } catch (error) {
                console.error('❌ Error procesando GET:', error);
                // Retornar configuración por defecto en caso de error
                return new Response(JSON.stringify({
                    data: {
                        configs: [],
                        user_id: userId,
                        total_models: 0,
                        api_keys_status: {
                            has_google_key: false,
                            has_openrouter_key: false
                        },
                        message: 'Usando configuración por defecto',
                        error_details: error.message
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

        } else if (req.method === 'POST') {
            // Guardar/actualizar configuración de modelos
            const requestData = await req.json();
            const { models, api_keys } = requestData;

            console.log(`💾 Guardando configuración para usuario: ${userId}`);

            try {
                let savedModelsCount = 0;
                let apiKeysUpdated = false;

                // Guardar configuración de modelos si se proporciona
                if (models && Array.isArray(models)) {
                    console.log(`📝 Procesando ${models.length} modelos...`);

                    // Eliminar configuración existente de modelos
                    await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'apikey': supabaseServiceKey,
                            'Content-Type': 'application/json'
                        }
                    });

                    // Validar y preparar nueva configuración
                    const configsToInsert = models
                        .filter(model => model && (model.id || model.model_name))
                        .map(model => ({
                            user_id: userId,
                            model_name: model.id || model.model_name,
                            enabled: Boolean(model.enabled)
                        }));

                    if (configsToInsert.length > 0) {
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

                        if (insertResponse.ok) {
                            const savedConfigs = await insertResponse.json();
                            savedModelsCount = savedConfigs.length;
                            console.log(`✅ ${savedModelsCount} modelos guardados`);
                        } else {
                            const errorText = await insertResponse.text();
                            console.error('❌ Error guardando modelos:', errorText);
                        }
                    }
                }

                // Guardar claves API si se proporcionan
                if (api_keys && (api_keys.google_api_key || api_keys.openrouter_api_key)) {
                    console.log('🔑 Actualizando claves API...');

                    // Eliminar claves existentes
                    await fetch(`${supabaseUrl}/rest/v1/user_api_keys?user_id=eq.${userId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'apikey': supabaseServiceKey,
                            'Content-Type': 'application/json'
                        }
                    });

                    // Insertar nuevas claves
                    const keysData = {
                        user_id: userId,
                        google_api_key: api_keys.google_api_key || null,
                        openrouter_api_key: api_keys.openrouter_api_key || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const keysResponse = await fetch(`${supabaseUrl}/rest/v1/user_api_keys`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'apikey': supabaseServiceKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(keysData)
                    });

                    if (keysResponse.ok) {
                        apiKeysUpdated = true;
                        console.log('✅ Claves API actualizadas');
                    } else {
                        const errorText = await keysResponse.text();
                        console.error('❌ Error guardando claves:', errorText);
                    }
                }

                return new Response(JSON.stringify({
                    data: {
                        success: true,
                        saved_models_count: savedModelsCount,
                        api_keys_updated: apiKeysUpdated,
                        message: `Configuración actualizada: ${savedModelsCount} modelos${apiKeysUpdated ? ', claves API actualizadas' : ''}`,
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
        console.error('❌ ERROR CRÍTICO en ai-config-manager:', error);
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