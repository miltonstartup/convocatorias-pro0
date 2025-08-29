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
        // Configurar la variable de entorno OPENROUTER_API_KEY
        const openRouterApiKey = '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';
        
        // Obtener variables de entorno de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Variables de Supabase no disponibles');
        }

        // Usar Supabase Management API para configurar la variable
        const projectId = supabaseUrl.split('.')[0].replace('https://', '');
        
        const configResponse = await fetch(`https://api.supabase.com/v1/projects/${projectId}/secrets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ACCESS_TOKEN')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'OPENROUTER_API_KEY',
                value: openRouterApiKey
            })
        });

        if (!configResponse.ok) {
            const errorText = await configResponse.text();
            console.error('Error configurando variable:', errorText);
            throw new Error(`Error configurando variable: ${errorText}`);
        }

        console.log('Variable OPENROUTER_API_KEY configurada exitosamente');

        return new Response(JSON.stringify({
            success: true,
            message: 'Variable OPENROUTER_API_KEY configurada exitosamente'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'CONFIG_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
