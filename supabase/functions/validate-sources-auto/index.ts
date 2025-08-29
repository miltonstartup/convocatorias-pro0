// Edge Function: validate-sources-auto
// Validador automático de enlaces y correspondencia de datos
// Sistema anti-invención para verificar fuentes de convocatorias

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
        console.log('🔍 VALIDADOR AUTOMÁTICO DE FUENTES - Iniciando verificación');
        
        const requestData = await req.json();
        const { convocatorias, max_concurrent = 3, timeout_seconds = 10 } = requestData;

        if (!convocatorias || !Array.isArray(convocatorias)) {
            throw new Error('Se requiere un array de convocatorias para validar');
        }

        console.log(`🧪 Validando ${convocatorias.length} convocatorias con ${max_concurrent} conexiones concurrentes...`);

        // Procesar convocatorias en lotes para evitar sobrecarga
        const validatedResults = [];
        for (let i = 0; i < convocatorias.length; i += max_concurrent) {
            const batch = convocatorias.slice(i, i + max_concurrent);
            console.log(`🔄 Procesando lote ${Math.floor(i / max_concurrent) + 1}...`);
            
            const batchPromises = batch.map(convocatoria => 
                validateSingleConvocatoria(convocatoria, timeout_seconds)
            );
            
            const batchResults = await Promise.all(batchPromises);
            validatedResults.push(...batchResults);
            
            // Pequeña pausa entre lotes
            if (i + max_concurrent < convocatorias.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successfulValidations = validatedResults.filter(r => r.validation_status === 'verified').length;
        const partialValidations = validatedResults.filter(r => r.validation_status === 'partial').length;
        const failedValidations = validatedResults.filter(r => r.validation_status === 'failed').length;

        console.log(`✅ Validación completada: ${successfulValidations} verificadas, ${partialValidations} parciales, ${failedValidations} fallidas`);
        
        return new Response(JSON.stringify({
            data: {
                validated_convocatorias: validatedResults,
                validation_summary: {
                    total: validatedResults.length,
                    verified: successfulValidations,
                    partial: partialValidations,
                    failed: failedValidations,
                    success_rate: Math.round((successfulValidations / validatedResults.length) * 100)
                },
                processing_info: {
                    max_concurrent: max_concurrent,
                    timeout_seconds: timeout_seconds,
                    processed_at: new Date().toISOString()
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ ERROR en validador automático:', error);
        return new Response(JSON.stringify({
            error: {
                code: 'SOURCE_VALIDATION_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Validar una sola convocatoria
async function validateSingleConvocatoria(convocatoria: any, timeoutSeconds: number): Promise<any> {
    const startTime = Date.now();
    console.log(`🔍 Validando: ${convocatoria.title}`);
    
    const validationResult = {
        ...convocatoria,
        original_data: {
            title: convocatoria.title,
            organization: convocatoria.organization,
            amount: convocatoria.amount,
            deadline: convocatoria.deadline,
            source_url: convocatoria.source_url
        },
        source_validation: {
            url_accessible: false,
            content_extracted: false,
            title_match: false,
            organization_match: false,
            amount_found: false,
            deadline_found: false,
            content_relevance: 0
        },
        extracted_content: {
            title: null,
            text_content: null,
            organization_mentions: [],
            amount_mentions: [],
            date_mentions: []
        },
        validation_status: 'failed',
        validation_score: 0,
        validation_notes: [],
        processing_time_ms: 0
    };

    try {
        // 1. Validar que la URL sea válida
        if (!convocatoria.source_url || !isValidUrl(convocatoria.source_url)) {
            validationResult.validation_notes.push('URL inválida o faltante');
            return finalizeValidation(validationResult, startTime);
        }

        // 2. Verificar accesibilidad del enlace
        console.log(`🌐 Verificando accesibilidad de: ${convocatoria.source_url}`);
        const fetchResult = await fetchWithTimeout(convocatoria.source_url, timeoutSeconds * 1000);
        
        if (!fetchResult.success) {
            validationResult.validation_notes.push(`Error al acceder: ${fetchResult.error}`);
            return finalizeValidation(validationResult, startTime);
        }

        validationResult.source_validation.url_accessible = true;
        validationResult.validation_notes.push('URL accesible correctamente');

        // 3. Extraer contenido de la página
        console.log(`📋 Extrayendo contenido de la página...`);
        const extractedContent = extractPageContent(fetchResult.content);
        validationResult.extracted_content = extractedContent;
        
        if (extractedContent.title || extractedContent.text_content) {
            validationResult.source_validation.content_extracted = true;
            validationResult.validation_notes.push('Contenido extraído exitosamente');
        }

        // 4. Comparar datos de la IA vs contenido real
        const comparisonResults = compareDataWithSource(convocatoria, extractedContent);
        validationResult.source_validation = { ...validationResult.source_validation, ...comparisonResults };

        // 5. Calcular puntuación de validación
        validationResult.validation_score = calculateValidationScore(validationResult.source_validation);
        
        // 6. Determinar estado final
        if (validationResult.validation_score >= 70) {
            validationResult.validation_status = 'verified';
        } else if (validationResult.validation_score >= 40) {
            validationResult.validation_status = 'partial';
        } else {
            validationResult.validation_status = 'failed';
        }

        console.log(`✅ Validación completada: ${convocatoria.title} - Score: ${validationResult.validation_score}`);

    } catch (error) {
        console.error(`❌ Error validando ${convocatoria.title}:`, error);
        validationResult.validation_notes.push(`Error interno: ${error.message}`);
    }

    return finalizeValidation(validationResult, startTime);
}

// Hacer fetch con timeout
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'ConvocatoriasPro-Validator/1.0'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const content = await response.text();
        return { success: true, content };
        
    } catch (error) {
        if (error.name === 'AbortError') {
            return { success: false, error: 'Timeout: La página tardó demasiado en responder' };
        }
        return { success: false, error: error.message };
    }
}

// Extraer contenido relevante de la página
function extractPageContent(html: string): any {
    try {
        // Limpiar HTML y extraer texto
        let text = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remover scripts
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // Remover estilos
            .replace(/<[^>]+>/g, ' ')                           // Remover tags HTML
            .replace(/\s+/g, ' ')                              // Normalizar espacios
            .trim();

        // Extraer título (buscando patrones comunes)
        const titlePatterns = [
            /<title[^>]*>([^<]+)<\/title>/i,
            /<h1[^>]*>([^<]+)<\/h1>/i,
            /<h2[^>]*>([^<]+)<\/h2>/i
        ];
        
        let title = null;
        for (const pattern of titlePatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                title = match[1].trim();
                break;
            }
        }

        // Extraer menciones de organizaciones
        const organizationPatterns = [
            /CORFO/gi, /ANID/gi, /MinCiencia/gi, /SERCOTEC/gi, /FIA/gi,
            /Ministerio/gi, /Comisión/gi, /Agencia/gi, /Fundación/gi
        ];
        const organizationMentions = [];
        for (const pattern of organizationPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                organizationMentions.push(...matches.map(m => m.toLowerCase()));
            }
        }

        // Extraer menciones de montos
        const amountPatterns = [
            /\$([\d,\.]+)/g,
            /([\d,\.]+)\s*(?:pesos|clp|usd|uf)/gi,
            /hasta\s*([\d,\.]+)/gi
        ];
        const amountMentions = [];
        for (const pattern of amountPatterns) {
            const matches = [...text.matchAll(pattern)];
            amountMentions.push(...matches.map(m => m[0]));
        }

        // Extraer menciones de fechas
        const datePatterns = [
            /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/g,
            /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g,
            /\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/gi
        ];
        const dateMentions = [];
        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                dateMentions.push(...matches);
            }
        }

        return {
            title,
            text_content: text.substring(0, 2000), // Primeros 2000 caracteres
            organization_mentions: [...new Set(organizationMentions)],
            amount_mentions: [...new Set(amountMentions)],
            date_mentions: [...new Set(dateMentions)]
        };

    } catch (error) {
        console.error('Error extrayendo contenido:', error);
        return {
            title: null,
            text_content: null,
            organization_mentions: [],
            amount_mentions: [],
            date_mentions: []
        };
    }
}

// Comparar datos de la IA con el contenido de la fuente
function compareDataWithSource(convocatoria: any, extractedContent: any): any {
    const comparison = {
        title_match: false,
        organization_match: false,
        amount_found: false,
        deadline_found: false,
        content_relevance: 0
    };

    // Comparar título
    if (extractedContent.title && convocatoria.title) {
        const similarity = calculateStringSimilarity(
            convocatoria.title.toLowerCase(), 
            extractedContent.title.toLowerCase()
        );
        comparison.title_match = similarity > 0.6;
    }

    // Comparar organización
    if (convocatoria.organization && extractedContent.organization_mentions.length > 0) {
        const orgLower = convocatoria.organization.toLowerCase();
        comparison.organization_match = extractedContent.organization_mentions.some(mention => 
            orgLower.includes(mention) || mention.includes(orgLower)
        );
    }

    // Verificar mención de montos
    comparison.amount_found = extractedContent.amount_mentions.length > 0;

    // Verificar mención de fechas
    comparison.deadline_found = extractedContent.date_mentions.length > 0;

    // Calcular relevancia del contenido (basado en palabras clave de la consulta)
    if (extractedContent.text_content) {
        const keywords = ['convocatoria', 'financiamiento', 'fondo', 'beca', 'concurso', 'postulación'];
        const content = extractedContent.text_content.toLowerCase();
        const keywordMatches = keywords.filter(keyword => content.includes(keyword)).length;
        comparison.content_relevance = Math.round((keywordMatches / keywords.length) * 100);
    }

    return comparison;
}

// Calcular similitud entre strings
function calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

// Calcular distancia de Levenshtein
function levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Calcular puntuación de validación
function calculateValidationScore(validation: any): number {
    let score = 0;
    
    // Puntos por accesibilidad básica
    if (validation.url_accessible) score += 20;
    if (validation.content_extracted) score += 20;
    
    // Puntos por coincidencias de datos
    if (validation.title_match) score += 25;
    if (validation.organization_match) score += 20;
    if (validation.amount_found) score += 10;
    if (validation.deadline_found) score += 10;
    
    // Puntos por relevancia del contenido
    score += Math.floor(validation.content_relevance * 0.15);
    
    return Math.min(100, Math.max(0, score));
}

// Validar si una URL es válida
function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}

// Finalizar validación y calcular tiempo
function finalizeValidation(validationResult: any, startTime: number): any {
    validationResult.processing_time_ms = Date.now() - startTime;
    
    // Actualizar reliability_score basado en validación
    if (validationResult.validation_status === 'verified') {
        validationResult.reliability_score = Math.max(85, validationResult.validation_score);
    } else if (validationResult.validation_status === 'partial') {
        validationResult.reliability_score = Math.max(60, validationResult.validation_score);
    } else {
        validationResult.reliability_score = Math.min(50, validationResult.validation_score);
    }
    
    return validationResult;
}