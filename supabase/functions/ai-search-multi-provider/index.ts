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
        console.log('🔄 BÚSQUEDA MULTI-PROVEEDOR - Procesamiento iniciado');
        
        const requestData = await req.json();
        const { 
            search_query, 
            search_parameters = {}, 
            ai_provider = 'openrouter', // 'openrouter' | 'gemini' | 'smart_flow'
            selected_model = 'auto' 
        } = requestData;

        if (!search_query || search_query.trim().length === 0) {
            throw new Error('La consulta de búsqueda es requerida');
        }

        console.log('🔍 Configuración de búsqueda:', {
            query: search_query,
            provider: ai_provider,
            model: selected_model,
            parameters: search_parameters
        });

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Autenticación del usuario
        let userId = 'multi-provider-search-user';
        const authHeader = req.headers.get('authorization');
        
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userId = userData.id;
                    console.log('👤 Usuario autenticado:', userId);
                }
            } catch (authError) {
                console.warn('⚠️ Error de autenticación, usando usuario por defecto');
            }
        }

        // Detectar ubicación geográfica en la consulta
        const locationContext = detectLocationInQuery(search_query);
        console.log('🌍 Contexto geográfico detectado:', locationContext);

        // Crear registro de búsqueda
        const searchId = crypto.randomUUID();
        console.log('🆔 Creando registro de búsqueda multi-proveedor:', searchId);
        
        await fetch(`${supabaseUrl}/rest/v1/ai_searches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: searchId,
                user_id: userId,
                search_query: search_query.trim(),
                search_parameters: {
                    ...search_parameters,
                    ai_provider,
                    selected_model,
                    detected_location: locationContext
                },
                status: 'processing'
            })
        });

        // Ejecutar búsqueda según el proveedor seleccionado
        let searchResults = [];
        let processingMethod = '';

        switch (ai_provider) {
            case 'openrouter':
                console.log('🤖 Ejecutando búsqueda con OpenRouter...');
                searchResults = await executeOpenRouterSearch(search_query, search_parameters, locationContext, selected_model);
                processingMethod = 'openrouter_direct';
                break;
                
            case 'gemini':
                console.log('🧠 Ejecutando búsqueda con Gemini directo...');
                searchResults = await executeGeminiSearch(search_query, search_parameters, locationContext, selected_model);
                processingMethod = 'gemini_direct';
                break;
                
            case 'smart_flow':
                console.log('⚡ Ejecutando flujo inteligente Gemini (2 pasos)...');
                searchResults = await executeSmartFlowSearch(search_query, search_parameters, locationContext);
                processingMethod = 'gemini_smart_flow_2_steps';
                break;
                
            default:
                throw new Error('Proveedor de IA no soportado');
        }

        console.log('🤖 Resultados generados:', searchResults.length);

        // Guardar resultados en BD
        let savedResults = [];
        if (searchResults.length > 0) {
            const resultsToInsert = searchResults.map(result => ({
                id: crypto.randomUUID(),
                search_id: searchId,
                user_id: userId,
                title: result.title,
                description: result.description,
                deadline: result.deadline,
                amount: result.amount,
                requirements: result.requirements,
                source_url: result.source_url,
                validated_data: {
                    organization: result.organization,
                    category: result.category,
                    status: result.status,
                    reliability_score: result.reliability_score || 95,
                    tags: result.tags || [],
                    processing_method: processingMethod,
                    ai_provider: ai_provider,
                    selected_model: selected_model,
                    detected_location: locationContext
                }
            }));

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/ai_search_results`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(resultsToInsert)
            });

            if (insertResponse.ok) {
                savedResults = await insertResponse.json();
                console.log('✅ Resultados guardados en BD:', savedResults.length);
            } else {
                console.warn('⚠️ Error guardando resultados, usando temporales');
                savedResults = resultsToInsert;
            }
        }

        // Actualizar estado de búsqueda
        await fetch(`${supabaseUrl}/rest/v1/ai_searches?id=eq.${searchId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'completed',
                results_count: savedResults.length,
                completed_at: new Date().toISOString()
            })
        });

        console.log('✅ Búsqueda multi-proveedor completada exitosamente');
        
        return new Response(JSON.stringify({
            data: {
                search_id: searchId,
                results_count: savedResults.length,
                results: savedResults,
                processing_info: {
                    query_processed: search_query,
                    ai_provider: ai_provider,
                    selected_model: selected_model,
                    processing_method: processingMethod,
                    detected_location: locationContext,
                    timestamp: new Date().toISOString()
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ ERROR en búsqueda multi-proveedor:', error);
        
        return new Response(JSON.stringify({
            error: {
                code: 'MULTI_PROVIDER_SEARCH_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Detectar ubicación geográfica en la consulta
function detectLocationInQuery(query: string) {
    const text = query.toLowerCase();
    
    // Países específicos
    const countries = {
        'chile': 'chile',
        'argentina': 'argentina', 
        'perú': 'peru',
        'peru': 'peru',
        'colombia': 'colombia',
        'méxico': 'mexico',
        'mexico': 'mexico',
        'españa': 'españa',
        'spain': 'españa',
        'estados unidos': 'usa',
        'usa': 'usa',
        'eeuu': 'usa'
    };
    
    // Regiones chilenas
    const chileanRegions = {
        'metropolitana': 'metropolitana',
        'valparaíso': 'valparaiso', 
        'valparaiso': 'valparaiso',
        'biobío': 'biobio',
        'biobio': 'biobio',
        'la araucanía': 'araucania',
        'araucania': 'araucania',
        'los lagos': 'los_lagos',
        'antofagasta': 'antofagasta',
        'atacama': 'atacama',
        'maule': 'maule'
    };
    
    // Buscar países
    for (const [key, value] of Object.entries(countries)) {
        if (text.includes(key)) {
            return {
                type: 'country',
                location: value,
                detected_term: key,
                scope: 'national'
            };
        }
    }
    
    // Buscar regiones chilenas
    for (const [key, value] of Object.entries(chileanRegions)) {
        if (text.includes(key)) {
            return {
                type: 'region',
                location: value,
                country: 'chile',
                detected_term: key,
                scope: 'regional'
            };
        }
    }
    
    // Detectar términos internacionales
    const internationalTerms = ['internacional', 'internacional', 'global', 'worldwide', 'europa', 'latinoamérica', 'latinoamerica'];
    for (const term of internationalTerms) {
        if (text.includes(term)) {
            return {
                type: 'international',
                location: 'international',
                detected_term: term,
                scope: 'international'
            };
        }
    }
    
    // Sin ubicación específica detectada -> priorizar Chile + internacional
    return {
        type: 'default',
        location: 'chile_plus_international',
        scope: 'local_plus_international'
    };
}

// Ejecutar búsqueda con OpenRouter
async function executeOpenRouterSearch(query: string, parameters: any, locationContext: any, selectedModel: string) {
    // Llamar a la función existente ai-search-convocatorias
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-search-convocatorias`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            search_query: query,
            search_parameters: parameters
        })
    });
    
    if (!response.ok) {
        throw new Error('Error en búsqueda OpenRouter');
    }
    
    const data = await response.json();
    return data?.data?.results || [];
}

// Ejecutar búsqueda con Gemini directo
async function executeGeminiSearch(query: string, parameters: any, locationContext: any, selectedModel: string) {
    const geminiModel = selectedModel === 'auto' ? 'gemini-2.5-pro' : selectedModel;
    
    // Construir prompt con contexto geográfico
    const locationPrompt = buildLocationAwarePrompt(query, locationContext);
    
    console.log(`🎯 Ejecutando búsqueda Gemini directa con modelo: ${geminiModel}`);
    
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ask-gemini`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: locationPrompt,
            modelName: geminiModel
        })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error en búsqueda Gemini:', errorText);
        throw new Error('Error en búsqueda Gemini');
    }
    
    const data = await response.json();
    const responseText = data?.data?.text || data?.data?.response || '';
    return parseGeminiResponseToResults(responseText, query);
}

// Ejecutar flujo inteligente de 2 pasos
async function executeSmartFlowSearch(query: string, parameters: any, locationContext: any) {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/gemini-smart-search`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            search_query: query,
            search_parameters: parameters
        })
    });
    
    if (!response.ok) {
        throw new Error('Error en flujo inteligente');
    }
    
    const data = await response.json();
    return data?.data?.results || [];
}

// Construir prompt con contexto geográfico
function buildLocationAwarePrompt(query: string, locationContext: any): string {
    let basePrompt = `Actúa como un asistente especializado en financiamiento de proyectos. Proporciona una lista detallada, organizada y actualizada de oportunidades de financiamiento, concursos, becas o subvenciones disponibles para "${query}"`;
    
    // Agregar contexto geográfico específico
    switch (locationContext.scope) {
        case 'national':
            basePrompt += `, con enfoque específico en ${locationContext.location}`;
            break;
        case 'regional':
            basePrompt += `, con enfoque en la región ${locationContext.location}, Chile`;
            break;
        case 'international':
            basePrompt += `, con enfoque internacional y global`;
            break;
        case 'local_plus_international':
        default:
            basePrompt += `, priorizando oportunidades en Chile PRIMERO, luego incluyendo opciones internacionales relevantes`;
            break;
    }
    
    basePrompt += `.\n\nPara cada oportunidad, incluye la siguiente información:
- Nombre de la Oportunidad
- Organismo Convocante (institución, fundación, gobierno, etc.)
- Descripción (objetivos, tipo de proyectos apoyados y enfoque temático)
- Monto de Financiamiento (rango, monto máximo/mínimo, forma de entrega)
- Fecha Límite de Postulación (fecha exacta o período de convocatoria)
  Si no está abierta actualmente, indica: "Próxima convocatoria estimada: [mes/año]"
- Elegibilidad (quiénes pueden postular: individuos, organizaciones, nacionalidad, sector, etapa del proyecto, etc.)
- Criterios de Selección (factores clave de evaluación)
- Enlace Oficial (URL directo y funcional a la página de la convocatoria)
- Notas (opcional: idioma, cofinanciamiento, beneficios adicionales, etc.)

Instrucciones específicas:
- Prioriza convocatorias abiertas o próximas (en los próximos 6 meses)
- Solo incluye oportunidades con información verificable y enlaces oficiales activos
- Si no hay convocatorias activas, menciona programas destacados con fecha estimada de reapertura
- Organiza los resultados por fecha de cierre (próximas primero)
- Usa viñetas o una tabla clara para facilitar la lectura
- Asegúrate de que toda la información sea válida para 2025 o la fecha más reciente disponible

Devuelve la información en formato JSON válido con esta estructura:
{
  "convocatorias": [
    {
      "title": "Nombre de la convocatoria",
      "organization": "Organismo convocante",
      "description": "Descripción detallada",
      "amount": "Rango de financiamiento",
      "deadline": "2025-XX-XX",
      "requirements": "Requisitos de elegibilidad",
      "source_url": "https://enlace-oficial.com",
      "category": "Categoría",
      "status": "abierto",
      "tags": ["tag1", "tag2"],
      "reliability_score": 95
    }
  ]
}`;
    
    return basePrompt;
}

// Parsear respuesta de Gemini a formato de resultados
function parseGeminiResponseToResults(response: string, query: string) {
    try {
        // Intentar extraer JSON de la respuesta
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            if (jsonData.convocatorias && Array.isArray(jsonData.convocatorias)) {
                return jsonData.convocatorias;
            }
        }
        
        // Fallback: generar resultados sintéticos desde texto
        return [];
        
    } catch (error) {
        console.error('Error parseando respuesta Gemini:', error);
        return [];
    }
}