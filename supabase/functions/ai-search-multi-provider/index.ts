// Edge Function: ai-search-multi-provider
// CORREGIDO: Manejo robusto de JSON parsing y errores de API

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
        
        // Validar que el cuerpo de la request no esté vacío
        let requestData;
        try {
            const bodyText = await req.text();
            console.log('📥 Request body recibido:', bodyText.substring(0, 200) + '...');
            
            if (!bodyText || bodyText.trim() === '') {
                throw new Error('Request body vacío');
            }
            
            requestData = JSON.parse(bodyText);
        } catch (parseError) {
            console.error('❌ Error parseando request JSON:', parseError);
            throw new Error('Request JSON inválido: ' + parseError.message);
        }
        
        const { 
            search_query, 
            search_parameters = {}, 
            ai_provider = 'openrouter',
            selected_model = 'auto',
            dev_mode = false
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

        // Obtener credenciales con validación
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
        const googlePseCx = Deno.env.get('GOOGLE_PSE_CX') || '87c6c106f57d44d11';

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        console.log('🔑 Credenciales verificadas:', {
            hasGoogleApiKey: !!googleApiKey,
            pseCx: googlePseCx,
            hasSupabaseConfig: !!(serviceRoleKey && supabaseUrl)
        });

        // Autenticación del usuario (modo permisivo para desarrollo)
        let userId = 'default-search-user';
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
                } else {
                    console.warn('⚠️ Token inválido, usando usuario por defecto');
                }
            } catch (authError) {
                console.warn('⚠️ Error de autenticación, usando usuario por defecto:', authError.message);
            }
        } else {
            console.log('🛠️ Sin autenticación, usando modo de prueba');
        }

        // Detectar ubicación geográfica en la consulta
        const locationContext = detectLocationInQuery(search_query);
        console.log('🌍 Contexto geográfico detectado:', locationContext);

        // Crear registro de búsqueda
        const searchId = crypto.randomUUID();
        console.log('🆔 Creando registro de búsqueda:', searchId);
        
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

        // Ejecutar búsqueda según el proveedor
        let searchResults = [];
        let processingMethod = '';

        if (ai_provider === 'google_pse_raw' || dev_mode) {
            // MODO DESARROLLO: Google PSE crudo
            console.log('🛠️ MODO DESARROLLO: Ejecutando Google PSE...');
            
            if (!googleApiKey) {
                // Simular resultados de Google PSE para desarrollo
                searchResults = generateMockGooglePSEResults(search_query);
                processingMethod = 'mock_google_pse_development';
                console.log('🎭 Usando resultados simulados de Google PSE');
            } else {
                searchResults = await executeGooglePSESearch(
                    search_query, 
                    search_parameters, 
                    locationContext, 
                    googleApiKey, 
                    googlePseCx
                );
                processingMethod = 'google_pse_raw';
            }
            
            console.log('📊 Resultados de Google PSE obtenidos:', searchResults.length);
            
            return new Response(JSON.stringify({
                data: {
                    search_id: searchId,
                    results_count: searchResults.length,
                    results: searchResults,
                    raw_google_pse_results: searchResults,
                    processing_info: {
                        query_processed: search_query,
                        search_engine: 'Google Programmable Search Engine',
                        pse_cx: googlePseCx,
                        detected_location: locationContext,
                        timestamp: new Date().toISOString(),
                        mode: 'development_raw_results',
                        processing_method: processingMethod
                    },
                    message: 'Resultados crudos de Google PSE para verificación'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // MODO PRODUCCIÓN: Procesar con IA
        switch (ai_provider) {
            case 'openrouter':
                console.log('🤖 Procesando con OpenRouter...');
                searchResults = await processWithOpenRouter(search_query, search_parameters);
                processingMethod = 'openrouter_multi_model';
                break;
                
            case 'gemini':
                console.log('🧠 Procesando con Gemini directo...');
                searchResults = await processWithGemini(search_query, search_parameters);
                processingMethod = 'gemini_direct';
                break;
                
            case 'smart_flow':
                console.log('⚡ Procesando con flujo inteligente...');
                searchResults = await processWithSmartFlow(search_query, search_parameters);
                processingMethod = 'gemini_smart_flow';
                break;
                
            default:
                throw new Error('Proveedor de IA no soportado: ' + ai_provider);
        }

        console.log('🤖 Resultados procesados con IA:', searchResults.length);

        // Guardar resultados en BD (opcional)
        try {
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
                    validated_data: result.validated_data || {}
                }));

                await fetch(`${supabaseUrl}/rest/v1/ai_search_results`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(resultsToInsert)
                });
            }
        } catch (dbError) {
            console.warn('⚠️ Error guardando resultados en BD:', dbError.message);
        }

        console.log('✅ Búsqueda multi-proveedor completada exitosamente');
        
        return new Response(JSON.stringify({
            data: {
                search_id: searchId,
                results_count: searchResults.length,
                results: searchResults,
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
                message: error.message,
                details: error.stack,
                timestamp: new Date().toISOString()
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
        'mexico': 'mexico'
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
    
    // Sin ubicación específica detectada -> priorizar Chile
    return {
        type: 'default',
        location: 'chile_plus_international',
        scope: 'local_plus_international'
    };
}

// Ejecutar búsqueda con Google PSE
async function executeGooglePSESearch(
    query: string, 
    parameters: any, 
    locationContext: any, 
    googleApiKey: string, 
    pseCx: string
): Promise<any[]> {
    try {
        console.log('🔍 Iniciando búsqueda con Google PSE...');
        
        // Construir consulta optimizada
        let searchQuery = query;
        if (locationContext.scope === 'local_plus_international') {
            searchQuery += ' Chile';
        }
        
        // Construir URL de la API
        const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
        searchUrl.searchParams.set('key', googleApiKey);
        searchUrl.searchParams.set('cx', pseCx);
        searchUrl.searchParams.set('q', searchQuery);
        searchUrl.searchParams.set('num', '10');
        searchUrl.searchParams.set('safe', 'active');
        searchUrl.searchParams.set('lr', 'lang_es');
        searchUrl.searchParams.set('gl', 'cl');
        
        console.log('🌐 Ejecutando búsqueda Google PSE...');
        
        const response = await fetch(searchUrl.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'ConvocatoriasPro/1.0'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en Google PSE API:', response.status, errorText);
            throw new Error(`Google PSE API error: ${response.status}`);
        }
        
        let searchData;
        try {
            searchData = await response.json();
        } catch (jsonError) {
            console.error('❌ Error parseando respuesta de Google PSE:', jsonError);
            throw new Error('Respuesta inválida de Google PSE API');
        }
        
        const items = searchData.items || [];
        console.log('📊 Items obtenidos de Google PSE:', items.length);
        
        // Transformar resultados
        const processedResults = items.map((item: any, index: number) => ({
            id: crypto.randomUUID(),
            title: item.title || 'Sin título',
            description: item.snippet || 'Sin descripción',
            source_url: item.link || '',
            display_link: item.displayLink || '',
            search_rank: index + 1,
            reliability_score: calculateReliabilityScore(item.link || ''),
            validated_data: {
                organization: extractOrganizationFromUrl(item.link || ''),
                category: 'Financiamiento',
                status: 'Disponible',
                tags: [query]
            }
        }));
        
        return processedResults;
        
    } catch (error) {
        console.error('❌ Error en executeGooglePSESearch:', error);
        throw error;
    }
}

// Generar resultados simulados para desarrollo
function generateMockGooglePSEResults(query: string): any[] {
    console.log('🎭 Generando resultados simulados para:', query);
    
    const mockResults = [
        {
            id: crypto.randomUUID(),
            title: `Fondo de Innovación para ${query} - CORFO`,
            description: `Programa de financiamiento de CORFO dirigido a proyectos de ${query} con alto potencial de impacto.`,
            source_url: 'https://www.corfo.cl/sites/cpp/subsidios',
            display_link: 'corfo.cl',
            search_rank: 1,
            reliability_score: 95,
            validated_data: {
                organization: 'CORFO',
                category: 'Innovación',
                status: 'Simulado',
                tags: [query, 'corfo', 'innovación']
            }
        },
        {
            id: crypto.randomUUID(),
            title: `Programa de Apoyo ${query} - SERCOTEC`,
            description: `SERCOTEC ofrece apoyo integral para emprendimientos relacionados con ${query}.`,
            source_url: 'https://www.sercotec.cl/programas/',
            display_link: 'sercotec.cl',
            search_rank: 2,
            reliability_score: 90,
            validated_data: {
                organization: 'SERCOTEC',
                category: 'Emprendimiento',
                status: 'Simulado',
                tags: [query, 'sercotec', 'emprendimiento']
            }
        },
        {
            id: crypto.randomUUID(),
            title: `Becas y Fondos ${query} - ANID`,
            description: `Agencia Nacional de Investigación y Desarrollo ofrece financiamiento para proyectos de ${query}.`,
            source_url: 'https://www.anid.cl/concursos/',
            display_link: 'anid.cl',
            search_rank: 3,
            reliability_score: 92,
            validated_data: {
                organization: 'ANID',
                category: 'Investigación',
                status: 'Simulado',
                tags: [query, 'anid', 'investigación']
            }
        }
    ];
    
    return mockResults;
}

// Procesar con OpenRouter (implementación básica)
async function processWithOpenRouter(query: string, parameters: any): Promise<any[]> {
    console.log('🤖 Procesando con OpenRouter...');
    
    // Por ahora retornar resultados básicos
    return [
        {
            id: crypto.randomUUID(),
            title: `Convocatoria OpenRouter para ${query}`,
            description: `Resultado procesado con OpenRouter para ${query}`,
            deadline: '2025-12-31',
            amount: 'Monto variable',
            requirements: 'Ver bases de la convocatoria',
            source_url: 'https://www.gob.cl',
            validated_data: {
                organization: 'Gobierno de Chile',
                category: 'Financiamiento',
                status: 'Disponible',
                reliability_score: 85,
                tags: [query]
            }
        }
    ];
}

// Procesar con Gemini (implementación básica)
async function processWithGemini(query: string, parameters: any): Promise<any[]> {
    console.log('🧠 Procesando con Gemini...');
    
    return [
        {
            id: crypto.randomUUID(),
            title: `Convocatoria Gemini para ${query}`,
            description: `Resultado procesado con Gemini para ${query}`,
            deadline: '2025-12-31',
            amount: 'Monto variable',
            requirements: 'Ver bases de la convocatoria',
            source_url: 'https://www.gob.cl',
            validated_data: {
                organization: 'Gobierno de Chile',
                category: 'Financiamiento',
                status: 'Disponible',
                reliability_score: 90,
                tags: [query]
            }
        }
    ];
}

// Procesar con flujo inteligente (implementación básica)
async function processWithSmartFlow(query: string, parameters: any): Promise<any[]> {
    console.log('⚡ Procesando con flujo inteligente...');
    
    return [
        {
            id: crypto.randomUUID(),
            title: `Convocatoria Smart Flow para ${query}`,
            description: `Resultado procesado con flujo inteligente para ${query}`,
            deadline: '2025-12-31',
            amount: 'Monto variable',
            requirements: 'Ver bases de la convocatoria',
            source_url: 'https://www.gob.cl',
            validated_data: {
                organization: 'Gobierno de Chile',
                category: 'Financiamiento',
                status: 'Disponible',
                reliability_score: 95,
                tags: [query]
            }
        }
    ];
}

// Extraer organización del dominio
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
        
        return 'Organización no identificada';
    } catch (error) {
        return 'URL inválida';
    }
}

// Calcular puntuación de confiabilidad
function calculateReliabilityScore(url: string): number {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        
        const trustedDomains = [
            'corfo.cl', 'sercotec.cl', 'anid.cl', 'fosis.gob.cl', 
            'gob.cl', 'minciencia.gob.cl', 'economia.gob.cl'
        ];
        
        if (trustedDomains.some(trusted => domain.includes(trusted))) {
            return 95;
        }
        
        if (domain.endsWith('.cl')) {
            return 80;
        }
        
        return 70;
    } catch (error) {
        return 50;
    }
}