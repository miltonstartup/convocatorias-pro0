// Edge Function: ai-search-multi-provider
// ACTUALIZADO: Integración con Google Programmable Search Engine (PSE)
// Búsqueda web real + procesamiento IA para evitar alucinaciones

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
        console.log('🔄 BÚSQUEDA MULTI-PROVEEDOR CON GOOGLE PSE - Procesamiento iniciado');
        
        const requestData = await req.json();
        const { 
            search_query, 
            search_parameters = {}, 
            ai_provider = 'openrouter', // 'openrouter' | 'gemini' | 'smart_flow'
            selected_model = 'auto',
            dev_mode = false // Nuevo parámetro para modo desarrollo
        } = requestData;

        if (!search_query || search_query.trim().length === 0) {
            throw new Error('La consulta de búsqueda es requerida');
        }

        console.log('🔍 Configuración de búsqueda:', {
            query: search_query,
            provider: ai_provider,
            model: selected_model,
            parameters: search_parameters,
            dev_mode
        });

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
        const googlePseCx = Deno.env.get('GOOGLE_PSE_CX') || '87c6c106f57d44d11';

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        if (!googleApiKey) {
            throw new Error('GOOGLE_API_KEY no configurada. Añádela como secreto en Supabase.');
        }

        console.log('🔑 Credenciales verificadas:', {
            hasGoogleApiKey: !!googleApiKey,
            pseCx: googlePseCx,
            hasSupabaseConfig: !!(serviceRoleKey && supabaseUrl)
        });

        // Autenticación del usuario
        let userId = 'google-pse-search-user';
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
        console.log('🆔 Creando registro de búsqueda con Google PSE:', searchId);
        
        try {
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
                        detected_location: locationContext,
                        uses_google_pse: true
                    },
                    status: 'processing'
                })
            });
        } catch (dbError) {
            console.warn('⚠️ Error guardando búsqueda en BD, continuando:', dbError.message);
        }

        // NUEVA FUNCIONALIDAD: Búsqueda con Google PSE
        console.log('🔍 Ejecutando búsqueda con Google Programmable Search Engine...');
        const googlePseResults = await executeGooglePSESearch(
            search_query, 
            search_parameters, 
            locationContext, 
            googleApiKey, 
            googlePseCx
        );

        console.log('📊 Resultados de Google PSE obtenidos:', googlePseResults.length);

        // MODO DESARROLLO: Devolver resultados crudos para verificación
        if (dev_mode || ai_provider === 'google_pse_raw') {
            console.log('🛠️ MODO DESARROLLO: Devolviendo resultados crudos de Google PSE');
            
            return new Response(JSON.stringify({
                data: {
                    search_id: searchId,
                    results_count: googlePseResults.length,
                    raw_google_pse_results: googlePseResults,
                    processing_info: {
                        query_processed: search_query,
                        search_engine: 'Google Programmable Search Engine',
                        pse_cx: googlePseCx,
                        detected_location: locationContext,
                        timestamp: new Date().toISOString(),
                        mode: 'development_raw_results'
                    },
                    message: 'Resultados crudos de Google PSE para verificación'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // MODO PRODUCCIÓN: Procesar con IA según el proveedor seleccionado
        let searchResults = [];
        let processingMethod = '';

        switch (ai_provider) {
            case 'openrouter':
                console.log('🤖 Procesando resultados de Google PSE con OpenRouter...');
                searchResults = await processGooglePSEWithOpenRouter(googlePseResults, search_query);
                processingMethod = 'google_pse_plus_openrouter';
                break;
                
            case 'gemini':
                console.log('🧠 Procesando resultados de Google PSE con Gemini directo...');
                searchResults = await processGooglePSEWithGemini(googlePseResults, search_query);
                processingMethod = 'google_pse_plus_gemini_direct';
                break;
                
            case 'smart_flow':
                console.log('⚡ Procesando resultados de Google PSE con flujo inteligente...');
                searchResults = await processGooglePSEWithSmartFlow(googlePseResults, search_query);
                processingMethod = 'google_pse_plus_gemini_smart_flow';
                break;
                
            default:
                throw new Error('Proveedor de IA no soportado');
        }

        console.log('🤖 Resultados procesados con IA:', searchResults.length);

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
                    detected_location: locationContext,
                    google_pse_source: true
                }
            }));

            try {
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
            } catch (dbError) {
                console.warn('⚠️ Error de BD, usando resultados temporales:', dbError.message);
                savedResults = resultsToInsert;
            }
        }

        // Actualizar estado de búsqueda
        try {
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
        } catch (updateError) {
            console.warn('⚠️ Error actualizando estado de búsqueda:', updateError.message);
        }

        console.log('✅ Búsqueda multi-proveedor con Google PSE completada exitosamente');
        
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
                    google_pse_used: true,
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
                message: error.message,
                details: error.stack
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// NUEVA FUNCIÓN: Ejecutar búsqueda con Google Programmable Search Engine
async function executeGooglePSESearch(
    query: string, 
    parameters: any, 
    locationContext: any, 
    googleApiKey: string, 
    pseCx: string
): Promise<any[]> {
    try {
        console.log('🔍 Iniciando búsqueda con Google PSE...');
        
        // Construir consulta optimizada para convocatorias chilenas
        let searchQuery = query;
        
        // Añadir términos específicos para mejorar relevancia
        const convocatoriaTerms = ['convocatoria', 'fondo', 'financiamiento', 'beca', 'concurso', 'subsidio'];
        const hasConvocatoriaTerms = convocatoriaTerms.some(term => 
            query.toLowerCase().includes(term)
        );
        
        if (!hasConvocatoriaTerms) {
            searchQuery += ' convocatoria financiamiento';
        }
        
        // Añadir contexto geográfico si no está presente
        if (locationContext.scope === 'local_plus_international') {
            searchQuery += ' Chile';
        }
        
        console.log('🎯 Consulta optimizada:', searchQuery);
        
        // Construir URL de la API de Google Custom Search
        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.set('key', googleApiKey);
        searchUrl.searchParams.set('cx', pseCx);
        searchUrl.searchParams.set('q', searchQuery);
        searchUrl.searchParams.set('num', '10'); // Máximo 10 resultados
        searchUrl.searchParams.set('safe', 'active'); // Búsqueda segura
        searchUrl.searchParams.set('lr', 'lang_es'); // Priorizar español
        searchUrl.searchParams.set('gl', 'cl'); // Geolocalización Chile
        
        // Filtros adicionales basados en parámetros
        if (parameters.sector) {
            searchUrl.searchParams.set('q', `${searchQuery} ${parameters.sector}`);
        }
        
        console.log('🌐 URL de búsqueda Google PSE:', searchUrl.toString().replace(googleApiKey, 'API_KEY_HIDDEN'));
        
        // Realizar búsqueda
        const startTime = Date.now();
        const response = await fetch(searchUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'ConvocatoriasPro/1.0 (https://convocatorias-pro.cl)'
            }
        });
        
        const searchTime = Date.now() - startTime;
        console.log(`⏱️ Búsqueda Google PSE completada en ${searchTime}ms`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en Google PSE API:', response.status, errorText);
            throw new Error(`Google PSE API error: ${response.status} - ${errorText}`);
        }
        
        const searchData = await response.json();
        console.log('📊 Respuesta Google PSE:', {
            totalResults: searchData.searchInformation?.totalResults || 0,
            itemsReturned: searchData.items?.length || 0,
            searchTime: searchData.searchInformation?.searchTime || 'unknown'
        });
        
        // Procesar resultados de Google PSE
        const items = searchData.items || [];
        
        if (items.length === 0) {
            console.log('⚠️ No se encontraron resultados en Google PSE');
            return [];
        }
        
        // Transformar resultados de Google PSE a formato estándar
        const processedResults = items.map((item: any, index: number) => ({
            id: crypto.randomUUID(),
            title: item.title || 'Sin título',
            description: item.snippet || 'Sin descripción',
            source_url: item.link || '',
            display_link: item.displayLink || '',
            formatted_url: item.formattedUrl || '',
            cache_id: item.cacheId || null,
            page_map: item.pagemap || {},
            search_rank: index + 1,
            google_pse_data: {
                kind: item.kind,
                htmlTitle: item.htmlTitle,
                htmlSnippet: item.htmlSnippet,
                htmlFormattedUrl: item.htmlFormattedUrl
            },
            extracted_at: new Date().toISOString(),
            reliability_score: calculateInitialReliabilityScore(item),
            validation_status: 'pending_ai_processing'
        }));
        
        console.log('✅ Resultados de Google PSE procesados:', processedResults.length);
        
        return processedResults;
        
    } catch (error) {
        console.error('❌ Error en executeGooglePSESearch:', error);
        throw new Error(`Error en búsqueda Google PSE: ${error.message}`);
    }
}

// Calcular puntuación inicial de confiabilidad basada en la fuente
function calculateInitialReliabilityScore(item: any): number {
    let score = 70; // Base
    
    // Bonus por dominios confiables
    const trustedDomains = [
        'corfo.cl', 'sercotec.cl', 'anid.cl', 'fosis.gob.cl', 
        'gob.cl', 'minciencia.gob.cl', 'economia.gob.cl',
        'fia.cl', 'cnca.gob.cl', 'cntv.cl'
    ];
    
    const domain = item.displayLink?.toLowerCase() || '';
    if (trustedDomains.some(trusted => domain.includes(trusted))) {
        score += 20;
        console.log(`🏛️ Dominio confiable detectado: ${domain} (+20 puntos)`);
    }
    
    // Bonus por términos relevantes en el título
    const relevantTerms = ['convocatoria', 'fondo', 'financiamiento', 'beca', 'concurso', 'subsidio'];
    const title = (item.title || '').toLowerCase();
    const titleMatches = relevantTerms.filter(term => title.includes(term)).length;
    score += titleMatches * 2;
    
    // Bonus por términos relevantes en el snippet
    const snippet = (item.snippet || '').toLowerCase();
    const snippetMatches = relevantTerms.filter(term => snippet.includes(term)).length;
    score += snippetMatches * 1;
    
    return Math.min(100, Math.max(50, score));
}

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
    const internationalTerms = ['internacional', 'global', 'worldwide', 'europa', 'latinoamérica', 'latinoamerica'];
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

// FUNCIONES DE PROCESAMIENTO CON IA (Implementación básica para desarrollo)

// Procesar resultados de Google PSE con OpenRouter
async function processGooglePSEWithOpenRouter(googleResults: any[], query: string): Promise<any[]> {
    console.log('🤖 Procesando con OpenRouter...');
    
    // Concatenar contenido de Google PSE
    const webContent = googleResults.map(result => 
        `TÍTULO: ${result.title}\nDESCRIPCIÓN: ${result.description}\nURL: ${result.source_url}\n---`
    ).join('\n\n');
    
    const prompt = `INSTRUCCIONES CRÍTICAS - NO INVENTES NADA:

Analiza el siguiente contenido web REAL obtenido de una búsqueda sobre "${query}" y extrae SOLO la información de convocatorias que esté EXPLÍCITAMENTE presente en el texto.

REGLAS OBLIGATORIAS:
1. NUNCA inventes fechas, montos, organizaciones o enlaces
2. Si un dato no está en el texto: usa "NO DISPONIBLE"
3. CADA convocatoria debe tener su URL de origen específica
4. Si dudas de cualquier información: NO la incluyas

CONTENIDO WEB A ANALIZAR:
${webContent}

Extrae convocatorias en formato JSON:
{
  "convocatorias": [
    {
      "title": "[TÍTULO EXACTO DEL CONTENIDO]",
      "organization": "[ORGANIZACIÓN MENCIONADA O 'NO DISPONIBLE']",
      "description": "[DESCRIPCIÓN LITERAL O 'NO DISPONIBLE']",
      "amount": "[MONTO EXACTO O 'NO DISPONIBLE']",
      "deadline": "[FECHA EXACTA YYYY-MM-DD O 'NO DISPONIBLE']",
      "requirements": "[REQUISITOS MENCIONADOS O 'NO DISPONIBLE']",
      "source_url": "[URL ESPECÍFICA DEL RESULTADO]",
      "category": "Financiamiento",
      "status": "verificar",
      "tags": ["${query}"],
      "reliability_score": 85
    }
  ]
}`;

    try {
        const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
                'HTTP-Referer': 'https://convocatoriaspro.com',
                'X-Title': 'ConvocatoriasPro Google PSE Processor'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-sonnet',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1, // Muy baja para evitar creatividad
                max_tokens: 3000
            })
        });

        if (!openrouterResponse.ok) {
            throw new Error(`OpenRouter API error: ${openrouterResponse.status}`);
        }

        const aiResponse = await openrouterResponse.json();
        const aiContent = aiResponse.choices[0]?.message?.content || '';
        
        // Parsear respuesta JSON
        try {
            const cleanContent = aiContent.replace(/```json\n?|```/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            return parsed.convocatorias || [];
        } catch (parseError) {
            console.error('Error parseando respuesta OpenRouter:', parseError);
            return [];
        }
        
    } catch (error) {
        console.error('Error en processGooglePSEWithOpenRouter:', error);
        return [];
    }
}

// Procesar resultados de Google PSE con Gemini directo
async function processGooglePSEWithGemini(googleResults: any[], query: string): Promise<any[]> {
    console.log('🧠 Procesando con Gemini directo...');
    
    // Implementación similar a OpenRouter pero usando Gemini
    // Por ahora, devolver resultados básicos para desarrollo
    return googleResults.slice(0, 5).map(result => ({
        title: result.title,
        organization: extractOrganizationFromUrl(result.source_url),
        description: result.description,
        amount: 'NO DISPONIBLE',
        deadline: 'NO DISPONIBLE',
        requirements: 'Ver enlace original',
        source_url: result.source_url,
        category: 'Financiamiento',
        status: 'verificar',
        tags: [query],
        reliability_score: result.reliability_score
    }));
}

// Procesar resultados de Google PSE con flujo inteligente
async function processGooglePSEWithSmartFlow(googleResults: any[], query: string): Promise<any[]> {
    console.log('⚡ Procesando con flujo inteligente...');
    
    // Implementación del flujo de 2 pasos usando los resultados de Google PSE
    // Por ahora, devolver resultados básicos para desarrollo
    return googleResults.slice(0, 3).map(result => ({
        title: result.title,
        organization: extractOrganizationFromUrl(result.source_url),
        description: result.description,
        amount: 'NO DISPONIBLE',
        deadline: 'NO DISPONIBLE', 
        requirements: 'Ver enlace original',
        source_url: result.source_url,
        category: 'Financiamiento',
        status: 'verificar',
        tags: [query],
        reliability_score: result.reliability_score
    }));
}

// Extraer organización del dominio de la URL
function extractOrganizationFromUrl(url: string): string {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        
        const organizationMap: { [key: string]: string } = {
            'corfo.cl': 'CORFO',
            'sercotec.cl': 'SERCOTEC', 
            'anid.cl': 'ANID',
            'fosis.gob.cl': 'FOSIS',
            'minciencia.gob.cl': 'MinCiencia',
            'economia.gob.cl': 'Ministerio de Economía',
            'fia.cl': 'FIA',
            'cnca.gob.cl': 'CNCA',
            'cntv.cl': 'CNTV'
        };
        
        for (const [domainPattern, org] of Object.entries(organizationMap)) {
            if (domain.includes(domainPattern)) {
                return org;
            }
        }
        
        return 'NO DISPONIBLE';
    } catch (error) {
        return 'NO DISPONIBLE';
    }
}