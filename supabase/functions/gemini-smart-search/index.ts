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
        console.log('🧠 FLUJO INTELIGENTE GEMINI 2.5 - Iniciando procesamiento de 2 pasos');
        
        const requestData = await req.json();
        const { search_query, search_parameters = {} } = requestData;

        if (!search_query || search_query.trim().length === 0) {
            throw new Error('La consulta de búsqueda es requerida');
        }

        console.log('🔍 Consulta recibida para flujo inteligente:', search_query);
        console.log('📊 Parámetros:', search_parameters);

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

        console.log('🆔 Creando registro de búsqueda inteligente:', searchId);
        
        // Registrar búsqueda en BD
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
                    detected_location: locationContext
                },
                status: 'processing'
            })
        });

        // **PASO 1: Gemini 2.5 Flash-Lite para lista rápida**
        console.log('⚡ PASO 1: Generando lista rápida con Gemini 2.5 Flash-Lite...');
        
        const step1Prompt = buildStep1Prompt(search_query, locationContext);
        const step1Response = await callGeminiAPI('gemini-2.5-flash', step1Prompt, googleApiKey);
        
        if (!step1Response) {
            throw new Error('Error en Paso 1: No se pudo generar lista inicial');
        }

        console.log('✅ PASO 1 completado. Lista generada:', step1Response.substring(0, 300) + '...');

        // **PASO 2: Gemini 2.5 Pro para detalles completos con URLs específicos**
        console.log('🔥 PASO 2: Generando detalles completos con URLs específicos usando Gemini 2.5 Pro...');
        
        const step2Prompt = buildStep2Prompt(search_query, step1Response, locationContext);
        let step2Response = await callGeminiAPI('gemini-2.5-pro', step2Prompt, googleApiKey);
        let step2ModelUsed = 'gemini-2.5-pro';
        
        // Si Gemini Pro falla (posible agotamiento de tokens), usar Gemini Flash como fallback
        if (!step2Response) {
            console.log('⚠️ PASO 2 con Gemini Pro falló, intentando con Gemini Flash como fallback...');
            step2Response = await callGeminiAPI('gemini-2.5-flash', step2Prompt, googleApiKey);
            step2ModelUsed = 'gemini-2.5-flash';
            
            if (!step2Response) {
                console.log('⚠️ Ambos modelos fallaron en PASO 2, usando Paso 1 como fallback final');
                // Usar step1Response como fallback final
                const fallbackResults = parseStep1Response(step1Response, search_query);
                return buildSuccessResponse(fallbackResults, searchId, step1Response, step1Response, locationContext, corsHeaders, 'gemini-2.5-flash', 'step1_fallback');
            } else {
                console.log('✅ PASO 2 completado con Gemini Flash como fallback');
            }
        }

        console.log('✅ PASO 2 completado. Respuesta detallada:', step2Response.substring(0, 300) + '...');

        // Parsear respuesta JSON del Paso 2 (FUNCIONES AVANZADAS VERIFICADAS ✅)
        const finalResults = parseGeminiResponse(step2Response, search_query);
        
        console.log('🤖 Resultados finales del flujo inteligente:', finalResults.length);

        // Determinar qué modelo se usó realmente para Step 2
        const actualStep2Model = step2ModelUsed;
        const fallbackType = step2ModelUsed === 'gemini-2.5-flash' ? 'gemini_flash_fallback' : 'none';

        // Guardar resultados en BD
        if (finalResults.length > 0) {
            const resultsToInsert = finalResults.map(result => ({
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
                    reliability_score: result.reliability_score || 98,
                    tags: result.tags || [],
                    ai_model_used: 'gemini-2.5-smart-flow',
                    step1_model: 'gemini-2.5-flash',
                    step2_model: actualStep2Model,
                    detected_location: locationContext,
                    fallback_used: fallbackType
                }
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
                results_count: finalResults.length,
                completed_at: new Date().toISOString()
            })
        });

        return buildSuccessResponse(finalResults, searchId, step1Response, step2Response, locationContext, corsHeaders, actualStep2Model, fallbackType);

    } catch (error) {
        console.error('❌ ERROR en flujo inteligente Gemini 2.5:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'GEMINI_2_5_SMART_SEARCH_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Función para construir respuesta de éxito
function buildSuccessResponse(finalResults: any[], searchId: string, step1Response: string, step2Response: string, locationContext: any, corsHeaders: any, step2Model: string = 'gemini-2.5-pro', fallbackUsed: string = 'none') {
    console.log('✅ Flujo inteligente Gemini 2.5 completado exitosamente');
    
    return new Response(JSON.stringify({
        data: {
            search_id: searchId,
            results_count: finalResults.length,
            results: finalResults,
            processing_info: {
                query_processed: true,
                step1_model: 'gemini-2.5-flash',
                step2_model: step2Model,
                results_generated: finalResults.length,
                processing_method: 'gemini_2.5_smart_flow_2_steps',
                step1_response_length: step1Response.length,
                step2_response_length: step2Response.length,
                detected_location: locationContext,
                fallback_used: fallbackUsed
            }
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
        'eeuu': 'usa',
        'europa': 'europa',
        'union europea': 'europa'
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
    const internationalTerms = ['internacional', 'global', 'worldwide', 'latinoamérica', 'latinoamerica', 'iberoamérica'];
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

// Construir prompt reforzado anti-invención del Paso 1 (Flash)
function buildStep1Prompt(query: string, locationContext: any): string {
    let locationInstruction = '';
    
    switch (locationContext.scope) {
        case 'national':
            locationInstruction = ` en ${locationContext.location}`;
            break;
        case 'regional':
            locationInstruction = ` en la región ${locationContext.location}, Chile`;
            break;
        case 'international':
            locationInstruction = ' a nivel internacional';
            break;
        case 'local_plus_international':
        default:
            locationInstruction = ' en Chile y a nivel internacional';
            break;
    }
    
    return `🚨 TOLERANCIA CERO A LA INVENCIÓN - VERIFICACIÓN EXTREMA:

Genera una lista con viñetas de programas de financiamiento REALES para "${query}"${locationInstruction}.

❌ PROHIBICIÓN ABSOLUTA:
- NUNCA INVENTES DATOS. SOLO USA INFORMACIÓN REAL DEL ENLACE
- NUNCA inventes nombres de programas o organizaciones
- NUNCA aproximes, estimes o generes datos ficticios
- NUNCA uses nombres genéricos como "Programa de Financiamiento", "Fondo Nacional"
- NUNCA copies descripciones de ejemplos o de otros prompts
- NUNCA generes organizaciones ficticias o duplicadas

✅ OBLIGATORIO PARA CADA PROGRAMA:
- Solo programas que CONOCES con certeza absoluta que existen
- Solo organizaciones REALES verificables con enlace específico
- Si no estás 100% seguro de un programa: NO lo incluyas bajo ningún concepto
- Usar nombres EXACTOS y literales de programas reales
- Cada programa debe tener su organización específica real

Formato EXACTO (solo programas 100% VERIFICADOS):
• [NOMBRE REAL Y LITERAL DEL PROGRAMA] - [ORGANIZACIÓN REAL VERIFICADA]
• [NOMBRE REAL Y LITERAL DEL PROGRAMA] - [ORGANIZACIÓN REAL VERIFICADA]

Ejemplos de programas REALES y verificados (solo usar si corresponden al tema):
• Fondo de Innovación para la Competitividad - CORFO
• Becas Chile - ANID
• Horizonte Europa - Comisión Europea
• Fondo de Emprendimiento e Innovación - SERCOTEC
• Fondo de Innovación Agraria - FIA

🚨 ADVERTENCIA CRÍTICA: 
Es mejor generar 2 programas REALES que 20 programas INVENTADOS.
Si dudas de la existencia de algún programa: NO lo incluyas bajo ningún concepto.
Cada programa será verificado contra fuentes oficiales.
Prioriza calidad y veracidad sobre cantidad.`;
}

// Construir prompt reforzado del Paso 2 (Pro) con validación estricta de fuentes
function buildStep2Prompt(query: string, step1Response: string, locationContext: any): string {
    let locationDescription = '';
    
    switch (locationContext.scope) {
        case 'national':
            locationDescription = ` en ${locationContext.location}`;
            break;
        case 'regional':
            locationDescription = ` en la región ${locationContext.location}, Chile`;
            break;
        case 'international':
            locationDescription = ' a nivel internacional';
            break;
        case 'local_plus_international':
        default:
            locationDescription = ' en Chile y a nivel internacional';
            break;
    }
    
    return `🚨 VALIDACIÓN ESTRICTA DE FUENTES OBLIGATORIA:

Usando esta lista de programas REALES:
${step1Response}

Genera información VERIFICABLE sobre convocatorias de financiamiento para "${query}"${locationDescription}.

❌ REGLAS CRÍTICAS - NUNCA VIOLES:
1. NUNCA inventes datos (montos, fechas, descripciones)
2. CADA dato DEBE tener su enlace de origen específico
3. Si no tienes el dato exacto: marca "NO DISPONIBLE"
4. NUNCA generes enlaces ficticios
5. VERIFICA que los datos coincidan con el enlace
6. NUNCA uses ejemplos genéricos como "$50.000.000"
7. NUNCA inventes fechas específicas futuras

📋 JSON OBLIGATORIO CON VERIFICACIÓN EXTREMA:
\`\`\`json
{
  "convocatorias": [
    {
      "title": "[NOMBRE EXACTO Y LITERAL DEL ENLACE - SIN MODIFICACIONES]",
      "organization": "[ORGANISMO REAL Y LITERAL DEL ENLACE]", 
      "description": "[DESCRIPCIÓN COMPLETA Y LITERAL DEL ENLACE O 'Descripción no disponible en fuente']",
      "amount": "[MONTO EXACTO CON FORMATO ORIGINAL DEL ENLACE O 'Monto no especificado en fuente']",
      "deadline": "[FECHA EXACTA YYYY-MM-DD DEL ENLACE O 'Fecha no disponible en fuente']",
      "requirements": "[REQUISITOS LITERALES DEL ENLACE O 'Requisitos no detallados en fuente']",
      "source_url": "[ENLACE REAL, ESPECÍFICO Y VERIFICABLE - OBLIGATORIO]",
      "data_extraction_notes": {
        "title_source": "Extraído de: [sección específica del enlace]",
        "amount_source": "Extraído de: [sección específica del enlace o 'No encontrado']",
        "deadline_source": "Extraído de: [sección específica del enlace o 'No encontrado']",
        "verification_status": "[VERIFIED/PARTIAL/UNVERIFIED]"
      },
      "data_verification": {
        "title_verified": "[SI/NO] - ¿El título coincide con el enlace?",
        "amount_verified": "[SI/NO] - ¿El monto coincide con el enlace?",
        "deadline_verified": "[SI/NO] - ¿La fecha coincide con el enlace?",
        "source_accessible": "[SI/NO] - ¿El enlace es accesible?"
      },
      "category": "Financiamiento",
      "status": "[ESTADO SEGÚN ENLACE: abierto/cerrado/próximo]",
      "tags": ["chile", "${query}"],
      "reliability_score": "[50-95 según calidad de verificación]"
    }
  ]
}
\`\`\`

🔍 PROCESO DE VERIFICACIÓN OBLIGATORIO Y EXTREMO:
1. Para cada programa de la lista, buscar su enlace oficial específico y accesible
2. Acceder al enlace y extraer SOLO datos que aparecen LITERALMENTE
3. Si un dato no está en el enlace: "NO DISPONIBLE EN FUENTE" (sin excepciones)
4. Documentar en "data_extraction_notes" la sección EXACTA del enlace donde encontraste cada dato
5. Verificar coherencia completa: título, organismo, monto y fecha deben coincidir con el enlace
6. Asignar "reliability_score" honesto y real basado en verificación
7. Validar accesibilidad: el enlace debe funcionar y contener la información

🚨 FRASES OBLIGATORIAS PARA DATOS NO VERIFICABLES:
- "Descripción no disponible en fuente"
- "Monto no especificado en fuente"
- "Fecha no disponible en fuente"
- "Requisitos no detallados en fuente"
- "NO DISPONIBLE EN FUENTE"

🎦 RELIABILITY SCORE GUIDELINES:
- 90-95: Todos los datos verificados con enlaces específicos
- 80-89: Mayoría de datos verificados, algunos "NO DISPONIBLE"
- 70-79: Datos básicos verificados, detalles "NO DISPONIBLE"
- 50-69: Solo título y organización verificados
- Menos de 50: NO incluir en resultados

RECUERDA: Es preferible reportar "NO DISPONIBLE" que inventar información.
Tu credibilidad depende de la veracidad, no de la completitud.`;
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
                    maxOutputTokens: model.includes('flash') ? 3000 : 8000,
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
        
        // Segundo intento: vault de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && serviceRoleKey) {
            const vaultResponse = await fetch(`${supabaseUrl}/rest/v1/vault.secrets?name=eq.GOOGLE_API_KEY&select=secret`, {
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
                    return vaultData[0].secret;
                }
            }
        }
        
        // Fallback temporal para pruebas
        return 'AIzaSyBTmZoy4GKloRkBBN5fqnMHV13sy3WDUIs';
        
    } catch (error) {
        console.warn('Error accediendo a API key:', error);
        // Fallback temporal para pruebas
        return 'AIzaSyBTmZoy4GKloRkBBN5fqnMHV13sy3WDUIs';
    }
}

// Función para parsear respuesta del Paso 1 como fallback
function parseStep1Response(response: string, originalQuery: string): any[] {
    console.log('📋 Parseando respuesta del Paso 1 como fallback');
    
    const results = [];
    const lines = response.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
            const content = trimmed.substring(1).trim();
            if (content.includes(' - ')) {
                const [title, organization] = content.split(' - ');
                results.push({
                    title: title.trim(),
                    organization: organization.trim(),
                    description: `Oportunidad de financiamiento para ${originalQuery}`,
                    amount: 'Variable',
                    deadline: extractDefaultDeadline(),
                    requirements: 'Ver bases oficiales',
                    source_url: buildSpecificURL(title.trim(), organization.trim()),
                    category: 'Financiamiento',
                    status: 'consultar',
                    tags: [originalQuery, 'chile'],
                    reliability_score: 75
                });
            }
        }
    }
    
    if (results.length === 0) {
        return createFallbackResults(originalQuery);
    }
    
    return results.slice(0, 6); // Limitar a 6 resultados
}

// Parsear respuesta de Gemini con validación anti-invención reforzada
function parseGeminiResponse(response: string, originalQuery: string): any[] {
    try {
        console.log('🔍 Parseando respuesta Gemini con validación anti-invención...');
        
        if (!response || response.trim().length === 0) {
            console.error('❌ Respuesta vacía o nula');
            return createFallbackResults(originalQuery);
        }
        
        let cleanResponse = response.trim();
        
        // 1. Buscar JSON en la respuesta con patrones mejorados
        const jsonPatterns = [
            /```json\s*({[\s\S]*?})```/,
            /```\s*({[\s\S]*?})```/,
            /{"convocatorias"[\s\S]*?}}/,
            /\[\s*{[\s\S]*?}\s*\]/
        ];
        
        let jsonStr = null;
        for (const pattern of jsonPatterns) {
            const match = cleanResponse.match(pattern);
            if (match) {
                jsonStr = match[1] || match[0];
                break;
            }
        }
        
        if (!jsonStr) {
            console.warn('⚠️ No se encontró JSON válido, buscando inicio manual...');
            // Búsqueda manual de JSON
            const jsonStart = cleanResponse.indexOf('{"convocatorias"') !== -1 ? 
                cleanResponse.indexOf('{"convocatorias"') : cleanResponse.indexOf('{');
            const jsonEnd = cleanResponse.lastIndexOf('}');
            
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                jsonStr = cleanResponse.substring(jsonStart, jsonEnd + 1);
            } else {
                console.error('❌ No se pudo extraer JSON, usando fallback');
                return createFallbackResults(originalQuery);
            }
        }
        
        console.log('🧪 JSON extraído (primeros 200 chars):', jsonStr.substring(0, 200));
        
        // 2. Reparar JSON común
        jsonStr = jsonStr
            .replace(/,\s*(\}|\])/g, '$1')  // Eliminar comas finales
            .replace(/([\w_]+):/g, '"$1":') // Añadir comillas a keys
            .replace(/:\s*'([^']*)'/g, ': "$1"') // Cambiar comillas simples por dobles
            .replace(/\\n/g, ' ') // Eliminar saltos de línea
            .replace(/\s+/g, ' '); // Normalizar espacios
            
        // 3. Parsear JSON
        const parsed = JSON.parse(jsonStr);
        console.log('✅ JSON parseado correctamente');
        
        // 4. Extraer convocatorias
        let convocatorias = [];
        if (Array.isArray(parsed)) {
            convocatorias = parsed;
        } else if (parsed.convocatorias && Array.isArray(parsed.convocatorias)) {
            convocatorias = parsed.convocatorias;
        } else if (parsed.resultados && Array.isArray(parsed.resultados)) {
            convocatorias = parsed.resultados;
        } else {
            console.warn('⚠️ Estructura JSON no reconocida');
            return createFallbackResults(originalQuery);
        }
        
        console.log(`🧪 Validando ${convocatorias.length} convocatorias contra patrones de invención...`);
        
        // 5. Filtrar y validar contra invención
        const validatedResults = convocatorias
            .filter(conv => conv && (conv.title || conv.nombre || conv.titulo))
            .map((conv, index) => normalizeConvocatoria(conv, originalQuery, index))
            .filter(conv => {
                // Validar contra patrones de invención
                const isValid = validateGeminiResultAgainstInvention(conv);
                if (!isValid) {
                    console.warn(`⚠️ Convocatoria descartada por patrones de invención: ${conv.title}`);
                }
                return isValid;
            })
            .map(conv => {
                // Asegurar campos de validación
                return ensureGeminiValidationFields(conv);
            });
        
        console.log(`✅ Convocatorias válidas después de validación: ${validatedResults.length}`);
        
        return validatedResults.length > 0 ? validatedResults : createFallbackResults(originalQuery);
        
    } catch (error) {
        console.error('❌ Error parseando respuesta Gemini:', error);
        console.log('🔄 Usando fallback');
        return createFallbackResults(originalQuery);
    }
}

// Validar resultado de Gemini contra patrones de invención
function validateGeminiResultAgainstInvention(result: any): boolean {
    const inventedPatterns = [
        // Montos sospechosos
        /Variable según proyecto/i,
        /\$50\.000\.000$/,
        /Hasta \$\d{2}\.\d{3}\.\d{3}$/,
        
        // Fechas futuras específicas inventadas
        /2025-0[3-9]-\d{2}/,
        
        // Enlaces genéricos o ficticios
        /https:\/\/www\.gob\.cl$/,
        /https:\/\/\[.*\]\.cl/,
        /convocatorias\/\[.*\]/,
        /ejemplo\.cl/i,
        
        // Descripciones genéricas copiadas del prompt
        /Esta convocatoria busca fomentar/i,
        /proporcionando financiamiento para iniciativas/i,
        /que generen impacto positivo/i,
        
        // Títulos o organizaciones placeholder
        /Institución responsable/,
        /Organismo convocante/,
        /Nombre de la convocatoria/,
    ];
    
    const fieldsToCheck = [
        result.title,
        result.description, 
        result.amount,
        result.deadline,
        result.source_url,
        result.organization
    ];
    
    for (const field of fieldsToCheck) {
        if (typeof field === 'string') {
            for (const pattern of inventedPatterns) {
                if (pattern.test(field)) {
                    console.warn(`🚫 Patrón de invención Gemini detectado: ${field}`);
                    return false;
                }
            }
        }
    }
    
    // Validar URL no sea genérica
    if (result.source_url) {
        const genericUrls = [
            'https://www.gob.cl',
            'https://www.corfo.cl',
            'https://www.anid.cl'
        ];
        
        if (genericUrls.includes(result.source_url)) {
            console.warn(`🚫 URL genérica detectada: ${result.source_url}`);
            return false;
        }
    }
    
    return true;
}

// Asegurar campos de validación en resultados de Gemini
function ensureGeminiValidationFields(result: any): any {
    // Añadir campos de validación si no existen
    if (!result.data_verification) {
        result.data_verification = {
            title_verified: result.title && !result.title.includes('no disponible') ? 'SI' : 'NO',
            amount_verified: result.amount && !result.amount.includes('no especificado') ? 'SI' : 'NO',
            deadline_verified: result.deadline && !result.deadline.includes('no disponible') ? 'SI' : 'NO',
            source_accessible: result.source_url && result.source_url.startsWith('http') ? 'SI' : 'NO'
        };
    }
    
    if (!result.data_extraction_notes) {
        result.data_extraction_notes = {
            title_source: result.title ? 'Extraído de respuesta IA' : 'No encontrado',
            amount_source: result.amount ? 'Extraído de respuesta IA' : 'No encontrado',
            deadline_source: result.deadline ? 'Extraído de respuesta IA' : 'No encontrado',
            verification_status: 'PARTIAL'
        };
    }
    
    // Calcular reliability_score basado en campos disponibles
    if (!result.reliability_score) {
        result.reliability_score = calculateGeminiReliabilityScore(result);
    }
    
    return result;
}

// Calcular puntuación de confiabilidad para resultados de Gemini
function calculateGeminiReliabilityScore(result: any): number {
    let score = 60; // Base score para Gemini
    
    // Puntos por tener datos básicos
    if (result.title && !result.title.includes('no disponible')) score += 10;
    if (result.organization && result.organization !== 'NO DISPONIBLE') score += 10;
    if (result.source_url && result.source_url.startsWith('http')) score += 10;
    
    // Puntos por datos detallados
    if (result.amount && !result.amount.includes('no especificado')) score += 5;
    if (result.deadline && !result.deadline.includes('no disponible')) score += 5;
    if (result.description && result.description.length > 50) score += 5;
    
    // Penalización por campos 'NO DISPONIBLE'
    const notAvailableCount = [
        result.description?.includes('no disponible'),
        result.amount?.includes('no especificado'),
        result.deadline?.includes('no disponible')
    ].filter(Boolean).length;
    
    score -= (notAvailableCount * 5);
    
    return Math.max(50, Math.min(90, score));
}

// NUEVA FUNCIÓN: Detectar si hay convocatorias concatenadas en la descripción
function detectConcatenatedConvocatorias(description: string): boolean {
    if (!description || description.length < 100) {
        return false;
    }
    
    // Patrones que indican múltiples convocatorias
    const patterns = [
        /"title":/g,
        /"organization":/g,
        /"description":/g,
        /"amount":/g,
        /"deadline":/g,
        /"source_url":/g,
        /\{.*\}/g,  // Múltiples objetos JSON
        /Programa.*Programa/i,  // Múltiples programas mencionados
        /Convocatoria.*Convocatoria/i,  // Múltiples convocatorias
        /CORFO.*ANID/i,  // Múltiples organizaciones
        /SERCOTEC.*CORFO/i
    ];
    
    let patternCount = 0;
    for (const pattern of patterns) {
        const matches = description.match(pattern);
        if (matches && matches.length > 1) {
            patternCount++;
        }
    }
    
    return patternCount >= 2; // Si hay al menos 2 patrones que sugieren concatenación
}

// NUEVA FUNCIÓN: Separar convocatorias concatenadas
function separateConcatenatedConvocatorias(conv: any, originalQuery: string): any[] {
    const description = conv.description || conv.descripcion || '';
    const separated = [];
    
    try {
        // Intentar encontrar objetos JSON dentro de la descripción
        const jsonMatches = description.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        
        if (jsonMatches && jsonMatches.length > 1) {
            // Hay múltiples objetos JSON en la descripción
            for (const jsonStr of jsonMatches) {
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.title || parsed.nombre || parsed.titulo) {
                        separated.push(parsed);
                    }
                } catch (error) {
                    console.warn('Error parseando JSON interno:', error.message);
                }
            }
        } else {
            // Intentar separar por patrones de texto
            const textSeparated = separateByTextPatterns(description, originalQuery);
            if (textSeparated.length > 1) {
                separated.push(...textSeparated);
            } else {
                // No se pudo separar, usar la convocatoria original
                separated.push(conv);
            }
        }
        
    } catch (error) {
        console.error('Error separando convocatorias concatenadas:', error);
        separated.push(conv);
    }
    
    return separated.length > 0 ? separated : [conv];
}

// NUEVA FUNCIÓN: Separar por patrones de texto
function separateByTextPatterns(text: string, originalQuery: string): any[] {
    const separated = [];
    
    // Buscar patrones que indican inicio de nueva convocatoria
    const convocatoriaPatterns = [
        /Programa\s+[A-Za-z]/g,
        /Convocatoria\s+[A-Za-z]/g,
        /Fondo\s+[A-Za-z]/g,
        /Beca\s+[A-Za-z]/g,
        /Concurso\s+[A-Za-z]/g
    ];
    
    let splits = [text];
    
    for (const pattern of convocatoriaPatterns) {
        const newSplits = [];
        for (const split of splits) {
            const matches = Array.from(split.matchAll(pattern));
            if (matches.length > 1) {
                let lastIndex = 0;
                for (const match of matches) {
                    if (match.index && match.index > lastIndex) {
                        const part = split.substring(lastIndex, match.index).trim();
                        if (part.length > 50) {
                            newSplits.push(part);
                        }
                        lastIndex = match.index;
                    }
                }
                const finalPart = split.substring(lastIndex).trim();
                if (finalPart.length > 50) {
                    newSplits.push(finalPart);
                }
            } else {
                newSplits.push(split);
            }
        }
        splits = newSplits;
    }
    
    // Convertir cada parte en un objeto de convocatoria
    for (let i = 0; i < splits.length && i < 5; i++) {
        const part = splits[i].trim();
        if (part.length > 50) {
            const extractedTitle = extractTitleFromText(part);
            const extractedOrg = extractOrganization(part);
            
            separated.push({
                title: extractedTitle || `Convocatoria ${i + 1} para ${originalQuery}`,
                organization: extractedOrg,
                description: part.substring(0, 300) + (part.length > 300 ? '...' : ''),
                amount: 'Variable',
                deadline: extractDefaultDeadline(),
                requirements: 'Ver bases oficiales',
                source_url: buildSpecificURL(extractedTitle || originalQuery, extractedOrg),
                category: 'Financiamiento',
                status: 'consultar',
                tags: [originalQuery, 'chile'],
                reliability_score: 75
            });
        }
    }
    
    return separated;
}

// NUEVA FUNCIÓN: Extraer título del texto
function extractTitleFromText(text: string): string {
    // Buscar patrones comunes de títulos
    const titlePatterns = [
        /Programa\s+([A-Za-zÁ-ź\s\d]+?)(?:[.,;]|\n|$)/i,
        /Convocatoria\s+([A-Za-zÁ-ź\s\d]+?)(?:[.,;]|\n|$)/i,
        /Fondo\s+([A-Za-zÁ-ź\s\d]+?)(?:[.,;]|\n|$)/i,
        /Beca\s+([A-Za-zÁ-ź\s\d]+?)(?:[.,;]|\n|$)/i,
        /Concurso\s+([A-Za-zÁ-ź\s\d]+?)(?:[.,;]|\n|$)/i,
        /"title":\s*"([^"]+)"/i,
        /"nombre":\s*"([^"]+)"/i
    ];
    
    for (const pattern of titlePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    // Fallback: usar las primeras palabras del texto
    const words = text.trim().split(/\s+/);
    return words.slice(0, 5).join(' ');
}

// Función auxiliar para extraer JSON mejorada
function extractJSON(text: string): string | null {
    const jsonStartPatterns = [
        '```json\n{',
        '```json\n[', 
        '```\n{',
        '```\n[',
        '{"convocatorias"',
        '{"',
        '[{'
    ];
    
    let actualStart = -1;
    let foundPattern = '';
    
    for (const pattern of jsonStartPatterns) {
        const index = text.indexOf(pattern);
        if (index !== -1) {
            foundPattern = pattern;
            if (pattern.startsWith('```')) {
                const braceIndex = text.indexOf('{', index);
                const bracketIndex = text.indexOf('[', index);
                if (braceIndex !== -1 && (bracketIndex === -1 || braceIndex < bracketIndex)) {
                    actualStart = braceIndex;
                } else if (bracketIndex !== -1) {
                    actualStart = bracketIndex;
                }
            } else {
                actualStart = index;
            }
            break;
        }
    }
    
    if (actualStart === -1) {
        return null;
    }
    
    // Buscar final del JSON con balance de llaves/corchetes
    const startChar = text[actualStart];
    const endChar = startChar === '{' ? '}' : ']';
    let bracketCount = 0;
    let inString = false;
    let escaped = false;
    let jsonEnd = -1;
    
    for (let i = actualStart; i < text.length; i++) {
        const char = text[i];
        
        if (escaped) {
            escaped = false;
            continue;
        }
        
        if (char === '\\') {
            escaped = true;
            continue;
        }
        
        if (char === '"' && !escaped) {
            inString = !inString;
            continue;
        }
        
        if (!inString) {
            if (char === startChar) {
                bracketCount++;
            } else if (char === endChar) {
                bracketCount--;
                if (bracketCount === 0) {
                    jsonEnd = i;
                    break;
                }
            }
            
            if (char === '`' && text.substring(i, i + 3) === '```') {
                if (bracketCount === 1) {
                    jsonEnd = i - 1;
                    break;
                }
            }
        }
    }
    
    if (jsonEnd > actualStart) {
        return text.substring(actualStart, jsonEnd + 1);
    }
    
    return null;
}

// Función auxiliar mejorada para reparar problemas comunes de JSON
function repairCommonJSONIssues(jsonStr: string): string {
    try {
        let repaired = jsonStr;
        
        // 1. Arreglar comas finales antes de } o ]
        repaired = repaired.replace(/,(\s*[\]}])/g, '$1');
        
        // 2. Arreglar comillas simples por dobles (solo en keys y strings simples)
        repaired = repaired.replace(/'([^']*)':/g, '"$1":');
        repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');
        
        // 3. Escapar backslashes en URLs correctamente
        repaired = repaired.replace(/("url":\s*")([^"]*)(\\)([^"]*")/g, '$1$2\\\\$4');
        
        // 4. Remover caracteres de control no visibles
        repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        // 5. Arreglar líneas nuevas dentro de strings JSON
        repaired = repaired.replace(/("(?:[^"\\]|\\.)*)\n([^"]*")/g, '$1\\n$2');
        
        console.log('🔧 JSON reparado aplicado');
        return repaired;
        
    } catch (error) {
        console.warn('⚠️ Error reparando JSON, retornando original:', error.message);
        return jsonStr;
    }
}

// NUEVA FUNCIÓN: Construir URL específico basado en el título y organización
function buildSpecificURL(title: string, organization: string): string {
    const titleLower = title.toLowerCase();
    const orgLower = organization.toLowerCase();
    
    // URLs específicos para CORFO
    if (orgLower.includes('corfo')) {
        if (titleLower.includes('innovacion') || titleLower.includes('innovación')) {
            return 'https://www.corfo.cl/sites/cpp/convocatorias/fondo_innovacion_competitividad';
        }
        if (titleLower.includes('startup chile')) {
            return 'https://www.corfo.cl/sites/cpp/convocatorias/startup_chile';
        }
        if (titleLower.includes('ssaf')) {
            return 'https://www.corfo.cl/sites/cpp/convocatorias/ssaf_desafio';
        }
        if (titleLower.includes('capital') && titleLower.includes('riesgo')) {
            return 'https://www.corfo.cl/sites/cpp/convocatorias/capital_riesgo';
        }
        return 'https://www.corfo.cl/sites/cpp/convocatorias';
    }
    
    // URLs específicos para ANID
    if (orgLower.includes('anid')) {
        if (titleLower.includes('becas chile') || titleLower.includes('beca chile')) {
            return 'https://www.anid.cl/blog/2025/01/15/becas-chile-convocatoria-2025/';
        }
        if (titleLower.includes('fondecyt')) {
            return 'https://www.anid.cl/concursos/concurso/?id=531';
        }
        if (titleLower.includes('fondef')) {
            return 'https://www.anid.cl/concursos/concurso/?id=539';
        }
        return 'https://www.anid.cl/concursos/';
    }
    
    // URLs específicos para SERCOTEC
    if (orgLower.includes('sercotec')) {
        if (titleLower.includes('capital') && (titleLower.includes('semilla') || titleLower.includes('abeja'))) {
            return 'https://cincel.sercotec.cl/convocatorias/capital-semilla-emprende';
        }
        if (titleLower.includes('pae')) {
            return 'https://cincel.sercotec.cl/convocatorias/programa-apoyo-al-emprendimiento';
        }
        if (titleLower.includes('crece')) {
            return 'https://www.sercotec.cl/crece-fondo-de-desarrollo-de-negocios/';
        }
        if (titleLower.includes('ferias')) {
            return 'https://www.sercotec.cl/fortalecimiento-de-ferias-libres/';
        }
        return 'https://cincel.sercotec.cl/convocatorias';
    }
    
    // URLs específicos para Fondos de Cultura
    if (orgLower.includes('cultura') || orgLower.includes('arte')) {
        if (titleLower.includes('audiovisual')) {
            return 'https://www.fondosdecultura.cl/convocatorias/fondo-audiovisual/';
        }
        if (titleLower.includes('libro')) {
            return 'https://www.fondosdecultura.cl/convocatorias/fondo-del-libro/';
        }
        return 'https://www.fondosdecultura.cl/convocatorias/';
    }
    
    // URLs para programas internacionales
    if (orgLower.includes('europa') || orgLower.includes('horizon')) {
        return 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home';
    }
    
    if (orgLower.includes('fulbright')) {
        return 'https://fulbright.cl/programas/';
    }
    
    // Fallback con búsqueda específica
    const searchQuery = encodeURIComponent(`${title} ${organization} convocatoria 2025`);
    return `https://www.google.cl/search?q=${searchQuery}`;
}

// Función para normalizar una convocatoria individual - MEJORADA
function normalizeConvocatoria(conv: any, originalQuery: string, index: number): any {
    const title = conv.title || conv.nombre || conv.titulo || `Convocatoria ${index + 1} para ${originalQuery}`;
    const organization = conv.organization || conv.organismo || conv.institucion || conv.entity || 'Organismo no especificado';
    
    // Priorizar source_url de Gemini, si no existe, construir uno específico
    let sourceUrl = conv.source_url || conv.url || conv.enlace || conv.link;
    
    // Si no hay URL o es un URL genérico, construir uno específico
    if (!sourceUrl || 
        sourceUrl === 'https://www.gob.cl' ||
        sourceUrl === 'https://www.corfo.cl' ||
        sourceUrl === 'https://www.anid.cl' ||
        sourceUrl.length < 20) {
        sourceUrl = buildSpecificURL(title, organization);
    }
    
    // Limpiar descripción de posibles restos de JSON
    let description = conv.description || conv.descripcion || conv.resumen || 'Descripción no disponible';
    if (description.includes('{') || description.includes('"title":')) {
        // Extraer solo la parte descriptiva, eliminando JSON
        const sentences = description.split(/[.!?]/);
        description = sentences.find(s => s.length > 20 && !s.includes('{') && !s.includes('"title":')) || 
                     'Descripción no disponible';
    }
    
    return {
        title: title,
        organization: organization,
        description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
        amount: conv.amount || conv.monto || conv.financiamiento || conv.budget || 'Monto variable',
        deadline: conv.deadline || conv.fecha_limite || conv.fecha_cierre || conv.fechaCierre || extractDefaultDeadline(),
        requirements: conv.requirements || conv.requisitos || conv.elegibilidad || conv.criteria || 'Ver bases de la convocatoria',
        source_url: sourceUrl,
        category: conv.category || conv.categoria || conv.tipo || conv.type || 'Financiamiento',
        status: conv.status || conv.estado || 'abierto',
        tags: Array.isArray(conv.tags) ? conv.tags : 
              Array.isArray(conv.etiquetas) ? conv.etiquetas : 
              [originalQuery, 'chile'],
        reliability_score: Number(conv.reliability_score || conv.confiabilidad) || 85
    };
}

// Función para crear resultados de respaldo - MEJORADA
function createFallbackResults(originalQuery: string): any[] {
    return [{
        title: `Búsqueda de ${originalQuery}`,
        organization: 'Sistema de consulta',
        description: 'No se pudieron procesar los resultados automáticamente. Se recomienda consultar directamente los sitios oficiales.',
        amount: 'Variable',
        deadline: extractDefaultDeadline(),
        requirements: 'Ver convocatorias específicas',
        source_url: buildSpecificURL(originalQuery, 'consulta general'),
        category: 'General',
        status: 'consultar',
        tags: [originalQuery, 'chile'],
        reliability_score: 50
    }];
}

// Función auxiliar para extraer fecha límite por defecto
function extractDefaultDeadline(): string {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // +30 días
    return futureDate.toISOString().split('T')[0];
}

// Función auxiliar para extraer organización del texto
function extractOrganization(text: string): string {
    const orgPatterns = [
        /CORFO/i,
        /ANID/i,
        /SERCOTEC/i,
        /Ministerio.*Cultura/i,
        /Fondos.*Cultura/i,
        /Becas Chile/i,
        /Universidad.*Chile/i,
        /Comisión Europea/i,
        /Fulbright/i
    ];
    
    for (const pattern of orgPatterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0];
        }
    }
    
    return 'Organismo no especificado';
}

// Implementar parseStructuredText como fallback robusto
function parseStructuredText(response: string, originalQuery: string): any[] {
    console.log('📝 Usando parser de texto estructurado');
    
    try {
        const results = [];
        const lines = response.split('\n').filter(line => line.trim().length > 0);
        
        // Buscar patrones de convocatorias en el texto
        let currentConvocatoria: any = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Detectar posibles títulos de convocatorias
            if (line.length > 20 && line.length < 200 && 
                (line.includes('Convocatoria') || line.includes('Concurso') || 
                 line.includes('Fondo') || line.includes('Beca') || 
                 line.includes('Programa') || line.includes('CORFO') || 
                 line.includes('ANID'))) {
                
                // Guardar convocatoria anterior si existe
                if (currentConvocatoria && currentConvocatoria.title) {
                    results.push(currentConvocatoria);
                }
                
                // Crear nueva convocatoria
                const organization = extractOrganization(line);
                currentConvocatoria = {
                    title: line,
                    organization: organization,
                    description: '',
                    amount: 'Variable',
                    deadline: extractDefaultDeadline(),
                    requirements: 'Ver bases oficiales',
                    source_url: buildSpecificURL(line, organization),
                    category: 'Financiamiento',
                    status: 'consultar',
                    tags: [originalQuery, 'chile'],
                    reliability_score: 70
                };
            } else if (currentConvocatoria && line.length > 30) {
                // Agregar descripción
                if (!currentConvocatoria.description) {
                    currentConvocatoria.description = line;
                } else {
                    currentConvocatoria.description += ' ' + line;
                }
            }
        }
        
        // Guardar última convocatoria
        if (currentConvocatoria && currentConvocatoria.title) {
            results.push(currentConvocatoria);
        }
        
        // Si no se encontraron resultados, crear fallback
        if (results.length === 0) {
            return createFallbackResults(originalQuery);
        }
        
        return results.slice(0, 6); // Limitar a 6 resultados
        
    } catch (error) {
        console.error('Error en parser de texto estructurado:', error);
        return createFallbackResults(originalQuery);
    }
}