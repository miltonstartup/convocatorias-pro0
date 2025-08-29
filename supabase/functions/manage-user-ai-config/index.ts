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
        // Configuraciones de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Obtener el token de autorización
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Token de autorización requerido');
        }

        const jwt = authHeader.replace('Bearer ', '');
        
        // Verificar usuario usando Supabase Auth API
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'apikey': supabaseKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Usuario no autenticado');
        }

        const userData = await userResponse.json();
        const userId = userData.id;
        const method = req.method;
        
        if (method === 'GET') {
            // Obtener configuración actual del usuario
            console.log(`Obteniendo configuración de modelos para usuario: ${userId}`);
            
            const configResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!configResponse.ok) {
                const errorText = await configResponse.text();
                throw new Error(`Error al obtener configuraciones: ${errorText}`);
            }

            const configs = await configResponse.json();
            console.log(`Encontradas ${configs?.length || 0} configuraciones`);

            return new Response(JSON.stringify({
                data: {
                    configs: configs || [],
                    user_id: userId
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (method === 'POST') {
            // Guardar configuraciones de modelos
            const { model_configs } = await req.json();
            
            if (!model_configs || !Array.isArray(model_configs)) {
                throw new Error('model_configs debe ser un array');
            }

            console.log(`Guardando ${model_configs.length} configuraciones para usuario: ${userId}`);

            // Borrar configuraciones existentes del usuario
            const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                console.error('Error al borrar configuraciones existentes:', errorText);
                // No lanzar error aquí, puede ser que no haya configuraciones previas
            }

            // Insertar nuevas configuraciones
            const configsToInsert = model_configs.map(config => ({
                user_id: userId,
                model_name: config.model_name,
                enabled: config.enabled
            }));

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(configsToInsert)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                console.error('Error al insertar configuraciones:', errorText);
                throw new Error(`Error al guardar configuraciones: ${errorText}`);
            }

            const insertedConfigs = await insertResponse.json();
            console.log(`Configuraciones guardadas exitosamente: ${insertedConfigs?.length}`);

            return new Response(JSON.stringify({
                data: {
                    message: 'Configuraciones guardadas exitosamente',
                    configs: insertedConfigs,
                    count: insertedConfigs?.length
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            throw new Error(`Método ${method} no soportado`);
        }

    } catch (error) {
        console.error('Error en manage-user-ai-config:', error);

        const errorResponse = {
            error: {
                code: 'USER_CONFIG_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});