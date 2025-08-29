// Edge Function: setup-ai-keys-fixed (NUEVA)
// Configuración segura de claves API para servicios de IA
// Maneja Google AI (Gemini) y OpenRouter API keys

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
        console.log('🔑 [SETUP-AI-KEYS] Iniciando configuración de claves API...');
        
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
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'apikey': supabaseServiceKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Usuario no autenticado');
        }

        const userData = await userResponse.json();
        const userId = userData.id;
        console.log('👤 Usuario autenticado:', userId);

        if (req.method === 'POST') {
            // Guardar claves API
            const { google_api_key, openrouter_api_key } = await req.json();

            if (!google_api_key && !openrouter_api_key) {
                throw new Error('Al menos una clave API es requerida');
            }

            console.log('💾 Guardando configuración de claves API...');

            // Eliminar configuración existente
            await fetch(`${supabaseUrl}/rest/v1/user_api_keys?user_id=eq.${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            });

            // Insertar nueva configuración
            const keysData = {
                user_id: userId,
                google_api_key: google_api_key || null,
                openrouter_api_key: openrouter_api_key || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_api_keys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(keysData)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                throw new Error(`Error guardando claves: ${errorText}`);
            }

            const savedKeys = await insertResponse.json();
            console.log('✅ Claves API guardadas exitosamente');

            return new Response(JSON.stringify({
                data: {
                    success: true,
                    message: 'Claves API configuradas exitosamente',
                    has_google_key: Boolean(google_api_key),
                    has_openrouter_key: Boolean(openrouter_api_key),
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'GET') {
            // Obtener estado de las claves (sin exponer las claves reales)
            console.log('📋 Verificando estado de claves API...');
            
            const keysResponse = await fetch(`${supabaseUrl}/rest/v1/user_api_keys?user_id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!keysResponse.ok) {
                console.log('⚠️ No se encontraron claves configuradas');
                return new Response(JSON.stringify({
                    data: {
                        has_google_key: false,
                        has_openrouter_key: false,
                        message: 'No hay claves configuradas'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const keysData = await keysResponse.json();
            const userKeys = keysData[0] || {};

            return new Response(JSON.stringify({
                data: {
                    has_google_key: Boolean(userKeys.google_api_key),
                    has_openrouter_key: Boolean(userKeys.openrouter_api_key),
                    configured_at: userKeys.created_at || null,
                    last_updated: userKeys.updated_at || null
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            throw new Error(`Método ${req.method} no soportado`);
        }

    } catch (error) {
        console.error('❌ ERROR en setup-ai-keys:', error);

        return new Response(JSON.stringify({
            error: {
                code: 'SETUP_API_KEYS_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});