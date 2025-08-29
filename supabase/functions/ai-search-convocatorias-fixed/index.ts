// Edge Function: ai-search-convocatorias-fixed
// REDIRECCION a ai-search-convocatorias-optimized para compatibilidad completa
// Esta función mantiene compatibilidad con llamadas del frontend que usan -fixed

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
        console.log('🔄 [AI-SEARCH-FIXED] Redirigiendo a versión optimizada...');
        
        // Obtener todos los datos de la request
        const requestData = await req.json();
        
        // Obtener credenciales
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        if (!supabaseUrl) {
            throw new Error('SUPABASE_URL no configurada');
        }
        
        // Redireccionar a la función optimizada
        const optimizedUrl = `${supabaseUrl}/functions/v1/ai-search-convocatorias-optimized`;
        
        console.log('🚀 Llamando a función optimizada:', optimizedUrl);
        
        const response = await fetch(optimizedUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('authorization') || '',
                'apikey': req.headers.get('apikey') || ''
            },
            body: JSON.stringify(requestData)
        });
        
        const responseData = await response.text();
        
        console.log('✅ Respuesta recibida de función optimizada');
        
        return new Response(responseData, {
            status: response.status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            }
        });
        
    } catch (error) {
        console.error('❌ ERROR en ai-search-fixed redirect:', error);
        
        return new Response(JSON.stringify({
            error: {
                code: 'AI_SEARCH_REDIRECT_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});