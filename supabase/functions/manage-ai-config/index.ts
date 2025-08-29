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
        // Obtener credenciales de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Configuración de Supabase no disponible');
        }

        // Obtener el token de autorización
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Token de autorización requerido');
        }

        const jwt = authHeader.replace('Bearer ', '');

        // Verificar usuario autenticado
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

        if (req.method === 'GET') {
            // Obtener configuración de modelos del usuario
            console.log(`Obteniendo configuración para usuario: ${userId}`);

            const configResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!configResponse.ok) {
                const errorText = await configResponse.text();
                throw new Error(`Error al obtener configuración: ${errorText}`);
            }

            const configs = await configResponse.json();
            console.log(`Configuraciones encontradas: ${configs.length}`);

            return new Response(JSON.stringify({
                data: {
                    configs,
                    user_id: userId
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (req.method === 'POST') {
            // Guardar/actualizar configuración de modelos
            const { models } = await req.json();

            if (!models || !Array.isArray(models)) {
                throw new Error('Lista de modelos requerida');
            }

            console.log(`Guardando configuración para usuario: ${userId}, modelos: ${models.length}`);

            // Primero eliminar configuración existente
            const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!deleteResponse.ok) {
                console.log('No se pudo eliminar configuración existente (puede no existir)');
            }

            // Insertar nueva configuración
            const configsToInsert = models.map(model => ({
                user_id: userId,
                model_name: model.id || model.model_name,
                enabled: model.enabled || false
            }));

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
                throw new Error(`Error al guardar configuración: ${errorText}`);
            }

            const savedConfigs = await insertResponse.json();
            console.log(`Configuración guardada exitosamente: ${savedConfigs.length} modelos`);

            return new Response(JSON.stringify({
                data: {
                    success: true,
                    configs: savedConfigs,
                    message: 'Configuración guardada exitosamente'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            throw new Error(`Método ${req.method} no soportado`);
        }

    } catch (error) {
        console.error('Error en manage-ai-config:', error);

        const errorResponse = {
            error: {
                code: 'AI_CONFIG_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});