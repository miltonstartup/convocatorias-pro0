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
        // Verificar qué variables de entorno están disponibles
        const availableEnvVars = {};
        
        // Lista de variables que esperamos
        const expectedVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY', 
            'SUPABASE_SERVICE_ROLE_KEY',
            'OPENROUTER_API_KEY',
            'google_map_api_key'
        ];
        
        expectedVars.forEach(varName => {
            const value = Deno.env.get(varName);
            availableEnvVars[varName] = value ? 'CONFIGURADA' : 'NO CONFIGURADA';
        });
        
        console.log('Variables de entorno verificadas:', availableEnvVars);
        
        return new Response(JSON.stringify({
            success: true,
            environment_variables: availableEnvVars,
            timestamp: new Date().toISOString()
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error verificando variables:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'ENV_CHECK_FAILED',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
