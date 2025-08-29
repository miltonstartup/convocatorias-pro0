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
        // Extraer parámetros del cuerpo de la solicitud
        const requestData = await req.json();
        const { prompt, modelName = 'gemini-2.5-pro', maxTokens = 8192 } = requestData;

        if (!prompt) {
            throw new Error('El parámetro prompt es requerido');
        }

        // Obtener la API key de Google desde variables de entorno o base de datos
        let googleApiKey = Deno.env.get('GOOGLE_API_KEY');
        
        // Si no está en variables de entorno, obtener desde la base de datos
        if (!googleApiKey) {
            try {
                const supabaseUrl = Deno.env.get('SUPABASE_URL');
                const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                
                const configResponse = await fetch(`${supabaseUrl}/rest/v1/api_configurations?service_name=eq.google_gemini&select=api_key`, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey || '',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (configResponse.ok) {
                    const configs = await configResponse.json();
                    if (configs && configs.length > 0) {
                        googleApiKey = configs[0].api_key;
                        console.log('✅ API key de Google obtenida desde base de datos');
                    }
                }
            } catch (dbError) {
                console.warn('⚠️ No se pudo obtener API key desde base de datos:', dbError.message);
            }
        }
        
        if (!googleApiKey) {
            throw new Error('GOOGLE_API_KEY is required but not configured');
        }

        // Mapear nombres de modelos a sus identificadores API actualizados para Gemini 2.5
        const modelMapping: Record<string, string> = {
            'gemini-2.5-pro': 'gemini-2.5-pro',
            'gemini-2.5-flash-lite': 'gemini-2.5-flash',
            'gemini-2.5-flash': 'gemini-2.5-flash',
            'pro': 'gemini-2.5-pro',
            'flash-lite': 'gemini-2.5-flash',
            'flash': 'gemini-2.5-flash',
            // Fallbacks para compatibilidad
            'gemini-1.5-pro': 'gemini-2.5-pro',
            'gemini-1.5-flash': 'gemini-2.5-flash',
            'gemini-2.0-flash-exp': 'gemini-2.5-flash'
        };

        const selectedModel = modelMapping[modelName] || 'gemini-2.5-pro';
        
        console.log(`🧠 Usando modelo Gemini: ${selectedModel} (solicitado: ${modelName})`);

        // Construir la URL de la API de Google Gemini
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${googleApiKey}`;

        // Preparar el payload para la API de Gemini con configuración optimizada
        const geminiPayload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: selectedModel.includes('flash') ? 0.8 : 0.7, // Flash más creativo
                topP: selectedModel.includes('flash') ? 0.9 : 0.8,
                topK: selectedModel.includes('flash') ? 40 : 30
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };

        // Hacer la llamada a la API de Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(geminiPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error de la API de Gemini:', errorText);
            throw new Error(`Error de la API de Gemini: ${response.status} - ${errorText}`);
        }

        const geminiResponse = await response.json();

        // Extraer el texto de la respuesta
        let responseText = '';
        if (geminiResponse.candidates && geminiResponse.candidates.length > 0) {
            const candidate = geminiResponse.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                responseText = candidate.content.parts[0].text;
            }
        }

        if (!responseText) {
            throw new Error('No se pudo obtener respuesta válida de Gemini');
        }

        console.log(`✅ Respuesta Gemini generada: ${responseText.length} caracteres`);

        // Retornar respuesta exitosa
        return new Response(JSON.stringify({ 
            data: {
                text: responseText,
                model: selectedModel,
                usage: geminiResponse.usageMetadata || null,
                response: responseText // Para compatibilidad con frontend existente
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error en ask-gemini:', error);

        const errorResponse = {
            error: {
                code: 'GEMINI_API_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});