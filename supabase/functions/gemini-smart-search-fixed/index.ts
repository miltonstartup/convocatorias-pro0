// Edge Function: gemini-smart-search-fixed
// VERSIÓN INTERMEDIA - Incorporando gradualmente las mejoras para identificar el problema

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
        console.log('🧠 FLUJO INTELIGENTE GEMINI 2.5 - Versión Corregida');
        
        const requestData = await req.json();
        const { search_query, search_parameters = {} } = requestData;

        if (!search_query || search_query.trim().length === 0) {
            throw new Error('La consulta de búsqueda es requerida');
        }

        console.log('🔍 Consulta recibida:', search_query);

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const googleApiKey = await getGoogleApiKey();

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        if (!googleApiKey) {
            throw new Error('No se pudo obtener la API key de Google');
        }

        // Detectar ubicación geográfica en la consulta
        const locationContext = detectLocationInQuery(search_query);
        console.log('🌍 Contexto geográfico detectado:', locationContext);

        // Crear ID de búsqueda único
        const searchId = crypto.randomUUID();
        const userId = 'gemini-smart-search-user';

        console.log('🆔 Creando registro de búsqueda:', searchId);
        
        // **PASO 1: Gemini 2.5 Flash-Lite**
        console.log('⚡ PASO 1: Generando lista con Gemini 2.5 Flash-Lite...');
        
        const step1Prompt = buildStep1Prompt(search_query, locationContext);
        const step1Response = await callGeminiAPI('gemini-2.5-flash', step1Prompt, googleApiKey);
        
        if (!step1Response) {
            throw new Error('Error en Paso 1: No se pudo generar lista inicial');
        }

        console.log('✅ PASO 1 completado. Longitud respuesta:', step1Response.length);

        // **PASO 2: Gemini 2.5 Pro**
        console.log('🎯 PASO 2: Procesando con Gemini 2.5 Pro...');
        
        const step2Prompt = buildStep2Prompt(search_query, step1Response, locationContext);
        const step2Response = await callGeminiAPI('gemini-2.5-pro', step2Prompt, googleApiKey);
        
        if (!step2Response) {
            throw new Error('Error en Paso 2: No se pudieron generar detalles completos');
        }

        console.log('✅ PASO 2 completado. Longitud respuesta:', step2Response.length);

        // Parsear respuesta JSON del Paso 2 - VERSIÓN MEJORADA
        const finalResults = parseGeminiResponseFixed(step2Response, search_query);
        
        console.log('🤖 Resultados procesados:', finalResults.length);

        console.log('✅ Flujo inteligente completado exitosamente');
        
        return new Response(JSON.stringify({
            data: {
                search_id: searchId,
                results_count: finalResults.length,
                results: finalResults,
                processing_info: {
                    query_processed: search_query,
                    step1_model: 'gemini-2.5-flash',
                    step2_model: 'gemini-2.5-pro',
                    results_generated: finalResults.length,
                    processing_method: 'gemini_2.5_smart_flow_fixed',
                    step1_response_length: step1Response.length,
                    step2_response_length: step2Response.length,
                    detected_location: locationContext
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ ERROR en flujo inteligente:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'GEMINI_SMART_SEARCH_FIXED_ERROR',
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
        'spain': 'españa'
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
    
    // Sin ubicación específica detectada -> priorizar Chile + internacional
    return {
        type: 'default',
        location: 'chile_plus_international',
        scope: 'local_plus_international'
    };
}

// Construir prompt del Paso 1 (Flash-Lite)
function buildStep1Prompt(query: string, locationContext: any): string {
    let locationInstruction = '';
    
    switch (locationContext.scope) {
        case 'national':
            locationInstruction = ` en ${locationContext.location}`;
            break;
        case 'local_plus_international':
        default:
            locationInstruction = ' en Chile y a nivel internacional';
            break;
    }
    
    return `Genera una lista con viñetas de posibles nombres de programas, becas o concursos de financiamiento para "${query}"${locationInstruction}. 

No des detalles, solo los nombres y organizaciones. Formato:
• Nombre del Programa - Organización
• Nombre del Programa - Organización

Ejemplo:
• Fondo de Innovación para la Competitividad - CORFO
• Becas Chile - ANID
• Horizonte Europa - Comisión Europea

Genera entre 8-15 oportunidades relevantes. Solo nombres, sin descripciones.`;
}

// Construir prompt reforzado del Paso 2 (Pro) - GEMINI FIXED con validación estricta
function buildStep2Prompt(query: string, step1Response: string, locationContext: any): string {
    let locationDescription = '';
    
    switch (locationContext.scope) {
        case 'national':
            locationDescription = `, con enfoque específico en ${locationContext.location}`;
            break;
        case 'local_plus_international':
        default:
            locationDescription = ', priorizando oportunidades en Chile PRIMERO, luego incluyendo opciones internacionales relevantes';
            break;
    }
    
    return `🚨 VALIDACIÓN ESTRICTA DE FUENTES OBLIGATORIA:

Usando la siguiente lista de oportunidades REALES:
${step1Response}

Genera información VERIFICABLE sobre convocatorias de financiamiento para "${query}"${locationDescription}.

❌ REGLAS CRÍTICAS - NUNCA VIOLES:
1. NUNCA inventes datos (montos, fechas, descripciones)
2. CADA dato DEBE tener su enlace de origen específico
3. Si no tienes el dato exacto: marca "NO DISPONIBLE EN FUENTE"
4. NUNCA generes enlaces ficticios o genéricos
5. VERIFICA que los datos coincidan con el enlace
6. NUNCA uses ejemplos como "https://enlace-oficial.com"

Devuelve la respuesta en formato JSON válido con esta estructura:
{
  "convocatorias": [
    {
      "title": "[NOMBRE EXACTO DEL ENLACE - NO INVENTAR]",
      "organization": "[ORGANISMO REAL DEL ENLACE]",
      "description": "[DESCRIPCIÓN LITERAL O 'Descripción no disponible en fuente']",
      "amount": "[MONTO EXACTO O 'Monto no especificado en fuente']",
      "deadline": "[FECHA EXACTA YYYY-MM-DD O 'Fecha no disponible en fuente']",
      "requirements": "[REQUISITOS REALES O 'Requisitos no detallados en fuente']",
      "source_url": "[ENLACE REAL Y ESPECÍFICO - OBLIGATORIO]",
      "data_verification": {
        "title_verified": "[SI/NO]",
        "amount_verified": "[SI/NO]", 
        "deadline_verified": "[SI/NO]",
        "source_accessible": "[SI/NO]"
      },
      "category": "Financiamiento",
      "status": "[ESTADO REAL: abierto/cerrado/próximo]",
      "tags": ["${query}", "chile"],
      "reliability_score": "[50-95 según verificación real]"
    }
  ]
}

🔍 PROCESO OBLIGATORIO:
1. Para cada oportunidad, buscar enlace oficial específico
2. Extraer SOLO datos que aparecen en el enlace
3. Si dudas: "NO DISPONIBLE EN FUENTE"
4. Validar coherencia entre datos y enlace
5. Asignar reliability_score honesto

⚠️ IMPORTANTE:
- Es mejor tener menos resultados VERIFICABLES que muchos INVENTADOS
- Prioriza la veracidad sobre la completitud
- Tu credibilidad depende de no inventar información`;
}

// Función para llamar a Gemini API
async function callGeminiAPI(model: string, prompt: string, apiKey: string): Promise<string | null> {
    try {
        console.log(`🧠 Llamando a ${model} con prompt de ${prompt.length} caracteres`);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: model.includes('flash') ? 0.8 : 0.7,
                    maxOutputTokens: model.includes('flash') ? 3000 : 6000,
                    topP: model.includes('flash') ? 0.9 : 0.8,
                    topK: model.includes('flash') ? 40 : 30
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error en ${model}:`, response.status, errorText);
            return null;
        }

        const data = await response.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        
        console.log(`✅ ${model} respondió con ${result?.length || 0} caracteres`);
        
        return result;

    } catch (error) {
        console.error(`Error llamando a ${model}:`, error);
        return null;
    }
}

// Obtener API key de Google
async function getGoogleApiKey(): Promise<string | null> {
    try {
        // Primer intento: variables de entorno
        let apiKey = Deno.env.get('GOOGLE_API_KEY');
        if (apiKey) {
            return apiKey;
        }
        
        // Fallback temporal para pruebas
        return 'AIzaSyBTmZoy4GKloRkBBN5fqnMHV13sy3WDUIs';
        
    } catch (error) {
        console.warn('Error accediendo a API key:', error);
        // Fallback temporal para pruebas
        return 'AIzaSyBTmZoy4GKloRkBBN5fqnMHV13sy3WDUIs';
    }
}

// Parsear respuesta de Gemini - VERSIÓN SIMPLIFICADA PERO ROBUSTA
function parseGeminiResponseFixed(response: string, originalQuery: string): any[] {
    try {
        console.log('🔍 Parseando respuesta de Gemini (longitud:', response.length, ')');
        
        if (!response || response.trim().length === 0) {
            console.error('❌ Respuesta vacía o nula');
            return createFallbackResults(originalQuery);
        }
        
        let cleanResponse = response.trim();
        
        // Búsqueda simple pero efectiva de JSON
        const patterns = ['```json\n{', '```\n{', '{"convocatorias"', '{"'];
        let startIndex = -1;
        
        for (const pattern of patterns) {
            const index = cleanResponse.indexOf(pattern);
            if (index !== -1) {
                if (pattern.startsWith('```')) {
                    startIndex = cleanResponse.indexOf('{', index);
                } else {
                    startIndex = index;
                }
                break;
            }
        }
        
        if (startIndex === -1) {
            console.warn('⚠️ No se encontró inicio de JSON, usando fallback');
            return createFallbackResults(originalQuery);
        }
        
        // Buscar final del JSON de manera simple
        let endIndex = cleanResponse.lastIndexOf('}');
        const codeBlockEnd = cleanResponse.indexOf('```', startIndex + 3);
        if (codeBlockEnd !== -1 && codeBlockEnd < endIndex) {
            endIndex = cleanResponse.lastIndexOf('}', codeBlockEnd);
        }
        
        if (endIndex <= startIndex) {
            console.warn('⚠️ No se encontró final de JSON válido');
            return createFallbackResults(originalQuery);
        }
        
        cleanResponse = cleanResponse.substring(startIndex, endIndex + 1);
        console.log('🧹 JSON extraído (longitud:', cleanResponse.length, ')');
        
        // Reparación básica de JSON
        cleanResponse = cleanResponse.replace(/,\s*([\]}])/g, '$1'); // Remover comas finales
        
        // Intentar parsear JSON
        const parsed = JSON.parse(cleanResponse);
        console.log('✅ JSON parseado correctamente');
        
        let convocatorias = [];
        
        if (Array.isArray(parsed)) {
            convocatorias = parsed;
        } else if (parsed.convocatorias && Array.isArray(parsed.convocatorias)) {
            convocatorias = parsed.convocatorias;
        } else {
            console.warn('⚠️ Estructura JSON no reconocida');
            return createFallbackResults(originalQuery);
        }
        
        // Normalizar convocatorias de manera simple
        const normalized = convocatorias
            .filter(conv => conv && (conv.title || conv.nombre))
            .map((conv, index) => ({
                title: conv.title || conv.nombre || `Convocatoria ${index + 1} para ${originalQuery}`,
                organization: conv.organization || conv.organismo || 'Organismo no especificado',
                description: conv.description || conv.descripcion || 'Descripción no disponible',
                amount: conv.amount || conv.monto || 'Monto variable',
                deadline: conv.deadline || conv.fecha_limite || extractDefaultDeadline(),
                requirements: conv.requirements || conv.requisitos || 'Ver bases de la convocatoria',
                source_url: conv.source_url || conv.url || 'https://www.gob.cl',
                category: conv.category || conv.categoria || 'Financiamiento',
                status: conv.status || conv.estado || 'abierto',
                tags: conv.tags || [originalQuery, 'chile'],
                reliability_score: conv.reliability_score || 85
            }));
        
        console.log('✅ Normalización completada:', normalized.length, 'convocatorias');
        
        return normalized.length > 0 ? normalized : createFallbackResults(originalQuery);
        
    } catch (error) {
        console.error('❌ Error parseando JSON:', error.message);
        console.log('🔄 Usando fallback');
        return createFallbackResults(originalQuery);
    }
}

// Función auxiliar para extraer fecha límite por defecto
function extractDefaultDeadline(): string {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 días
    return futureDate.toISOString().split('T')[0];
}

// Función para crear resultados de respaldo
function createFallbackResults(originalQuery: string): any[] {
    return [{
        title: `Búsqueda de ${originalQuery}`,
        organization: 'Sistema de consulta',
        description: 'No se pudieron procesar los resultados automáticamente. Se recomienda consultar directamente los sitios oficiales.',
        amount: 'Variable',
        deadline: extractDefaultDeadline(),
        requirements: 'Ver convocatorias específicas',
        source_url: 'https://www.gob.cl',
        category: 'General',
        status: 'consultar',
        tags: [originalQuery, 'chile'],
        reliability_score: 50
    }];
}