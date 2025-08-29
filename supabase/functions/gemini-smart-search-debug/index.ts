// Edge Function: gemini-smart-search-debug
// VERSIÓN SIMPLIFICADA PARA DEBUGGING
// Evita llamadas externas y retorna datos mockeados para identificar problemas

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
        console.log('🔍 [DEBUG] Iniciando función de debugging...');
        
        // Verificar que se puede leer el request
        const requestData = await req.json();
        const { search_query, search_parameters = {} } = requestData;

        console.log('🔍 [DEBUG] Request leído exitosamente:', { search_query, search_parameters });

        if (!search_query || search_query.trim().length === 0) {
            throw new Error('La consulta de búsqueda es requerida');
        }

        // Verificar credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        
        console.log('🔍 [DEBUG] Credenciales verificadas:', {
            hasServiceRoleKey: !!serviceRoleKey,
            hasSupabaseUrl: !!supabaseUrl
        });

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Probar la función parseGeminiResponse con datos de prueba
        console.log('🔍 [DEBUG] Probando parseGeminiResponse...');
        
        const mockGeminiResponse = `{
  "convocatorias": [
    {
      "title": "Fondo de Innovación para la Competitividad - CORFO",
      "organization": "CORFO",
      "description": "Programa de financiamiento para proyectos de innovación tecnológica en Chile.",
      "amount": "Hasta $200.000.000",
      "deadline": "2025-12-31",
      "requirements": "Empresas chilenas con proyectos de innovación",
      "source_url": "https://www.corfo.cl",
      "category": "Innovación",
      "status": "abierto",
      "tags": ["innovacion", "tecnologia", "chile"],
      "reliability_score": 95
    }
  ]
}`;
        
        const parsedResults = parseGeminiResponse(mockGeminiResponse, search_query);
        console.log('🔍 [DEBUG] parseGeminiResponse result:', parsedResults);

        // Crear ID de búsqueda único
        const searchId = crypto.randomUUID();
        
        console.log('🔍 [DEBUG] Creando respuesta final...');
        
        const response = {
            data: {
                search_id: searchId,
                results_count: parsedResults.length,
                results: parsedResults,
                debug_info: {
                    mode: 'debugging',
                    query_processed: search_query,
                    mock_data_used: true,
                    timestamp: new Date().toISOString()
                }
            }
        };

        console.log('🔍 [DEBUG] Enviando respuesta exitosa');
        
        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ [DEBUG] ERROR:', error);
        console.error('❌ [DEBUG] Error stack:', error.stack);
        
        return new Response(JSON.stringify({
            error: {
                code: 'DEBUG_ERROR',
                message: error.message,
                stack: error.stack
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Función parseGeminiResponse simplificada para debugging
function parseGeminiResponse(response: string, originalQuery: string): any[] {
    try {
        console.log('🔍 [DEBUG] parseGeminiResponse - entrada:', response.substring(0, 100));
        
        if (!response || response.trim().length === 0) {
            console.error('❌ [DEBUG] Respuesta vacía');
            return createFallbackResults(originalQuery);
        }
        
        // Intentar parsing directo del JSON
        const parsed = JSON.parse(response.trim());
        console.log('🔍 [DEBUG] JSON parseado exitosamente');
        
        let convocatorias = [];
        
        if (Array.isArray(parsed)) {
            convocatorias = parsed;
        } else if (parsed.convocatorias && Array.isArray(parsed.convocatorias)) {
            convocatorias = parsed.convocatorias;
        } else {
            console.warn('⚠️ [DEBUG] Estructura no reconocida, usando fallback');
            return createFallbackResults(originalQuery);
        }
        
        console.log('🔍 [DEBUG] Convocatorias encontradas:', convocatorias.length);
        
        // Normalizar sin complejidad extra
        const normalized = convocatorias.map((conv, index) => ({
            title: conv.title || `Convocatoria ${index + 1}`,
            organization: conv.organization || 'Organismo no especificado',
            description: conv.description || 'Descripción no disponible',
            amount: conv.amount || 'Monto variable',
            deadline: conv.deadline || '2025-12-31',
            requirements: conv.requirements || 'Ver bases',
            source_url: conv.source_url || 'https://www.gob.cl',
            category: conv.category || 'General',
            status: conv.status || 'abierto',
            tags: conv.tags || [originalQuery],
            reliability_score: conv.reliability_score || 85
        }));
        
        console.log('🔍 [DEBUG] Normalización completada:', normalized.length);
        
        return normalized;
        
    } catch (error) {
        console.error('❌ [DEBUG] Error en parseGeminiResponse:', error);
        return createFallbackResults(originalQuery);
    }
}

// Función de fallback simple
function createFallbackResults(originalQuery: string): any[] {
    console.log('🔍 [DEBUG] Creando resultados de fallback');
    
    return [{
        title: `Búsqueda de ${originalQuery} (Modo Debug)`,
        organization: 'Sistema de Debugging',
        description: 'Resultado de prueba generado en modo debugging.',
        amount: 'Variable',
        deadline: '2025-12-31',
        requirements: 'Prueba de debugging',
        source_url: 'https://www.gob.cl',
        category: 'Debug',
        status: 'prueba',
        tags: [originalQuery, 'debug'],
        reliability_score: 50
    }];
}