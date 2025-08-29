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
        // Obtener la API key de OpenRouter desde Supabase Vault o configuración
        let openRouterApiKey = null;
        
        // Intentar acceso a Supabase Vault primero
        try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
            
            if (supabaseUrl && serviceRoleKey) {
                console.log('🔐 Intentando acceso a Supabase Vault...');
                
                const vaultResponse = await fetch(`${supabaseUrl}/rest/v1/vault.secrets?name=eq.OPENROUTER_API_KEY&select=secret`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (vaultResponse.ok) {
                    const vaultData = await vaultResponse.json();
                    if (vaultData && vaultData.length > 0 && vaultData[0].secret) {
                        openRouterApiKey = vaultData[0].secret;
                        console.log('✅ OPENROUTER_API_KEY obtenida desde Supabase Vault');
                    }
                }
            }
        } catch (vaultError) {
            console.warn('⚠️ Error accediendo al Vault:', vaultError.message);
        }
        
        // Fallback a variable de entorno
        if (!openRouterApiKey) {
            openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
            if (openRouterApiKey) {
                console.log('✅ OPENROUTER_API_KEY desde variables de entorno');
            }
        }
        
        // Configuración directa como último recurso (debe ser reemplazada por Vault)
        if (!openRouterApiKey) {
            console.log('⚠️ Usando configuración directa temporal...');
            openRouterApiKey = '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';
        }
        
        if (!openRouterApiKey) {
            throw new Error('No se pudo obtener OPENROUTER_API_KEY desde ninguna fuente configurada.');
        }

        console.log('Consultando modelos disponibles de OpenRouter...');

        // Consultar la API de OpenRouter para obtener los modelos disponibles
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            console.error('Error al consultar OpenRouter:', errorText);
            throw new Error(`OpenRouter API error: ${errorText}`);
        }

        const openRouterData = await openRouterResponse.json();
        console.log('Respuesta de OpenRouter recibida');

        // Filtrar únicamente modelos GRATUITOS para análisis de texto
        const relevantModels = openRouterData.data
            .filter((model: any) => {
                // CRÍTICO: Solo modelos completamente gratuitos
                const isFree = model.pricing && 
                              (model.pricing.prompt === "0" || model.pricing.prompt === 0) &&
                              (model.pricing.completion === "0" || model.pricing.completion === 0);
                
                // Filtrar modelos que estén disponibles y sean útiles para análisis de texto
                return model.id && 
                       isFree &&                        // SOLO modelos gratuitos
                       !model.id.includes('vision') && // Excluir modelos de visión
                       !model.id.includes('image') &&  // Excluir modelos de imagen
                       !model.id.includes('dall-e') && // Excluir modelos de generación de imagen
                       !model.id.includes('whisper') && // Excluir modelos de audio
                       !model.id.includes('tts') &&     // Excluir text-to-speech
                       model.context_length &&          // Debe tener context length
                       model.context_length >= 4000;    // Mínimo 4k tokens para análisis
            })
            .map((model: any) => ({
                id: model.id,
                name: model.name || model.id,
                description: model.description || '',
                context_length: model.context_length,
                pricing: {
                    prompt: model.pricing?.prompt || '0',
                    completion: model.pricing?.completion || '0'
                },
                created: model.created,
                owned_by: model.owned_by || 'unknown'
            }))
            .sort((a: any, b: any) => {
                // Ordenar por popularidad de modelos GRATUITOS (mejores modelos gratuitos primero)
                const topFreeModels = [
                    'google/gemma-2-9b-it:free',
                    'meta-llama/llama-3.1-8b-instruct:free',
                    'microsoft/phi-3-mini-128k-instruct:free',
                    'qwen/qwen-2-7b-instruct:free',
                    'google/gemma',
                    'meta-llama/llama-3',
                    'microsoft/phi-3',
                    'qwen/qwen-2'
                ];
                
                const aTop = topFreeModels.some(top => a.id.includes(top));
                const bTop = topFreeModels.some(top => b.id.includes(top));
                
                if (aTop && !bTop) return -1;
                if (!aTop && bTop) return 1;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 20); // Limitar a los primeros 20 modelos gratuitos más relevantes

        console.log(`Procesados ${relevantModels.length} modelos gratuitos relevantes`);

        // Devolver los modelos formateados
        return new Response(JSON.stringify({
            data: {
                models: relevantModels,
                count: relevantModels.length,
                updated_at: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error en get-available-models:', error);

        const errorResponse = {
            error: {
                code: 'GET_MODELS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});