// Edge Function: parse-content-optimized
// Sistema optimizado de parsing con IA para convocatorias
// Mejoras: Mejor validación, manejo de errores, múltiples formatos

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
    console.log('📝 PARSE CONTENT OPTIMIZADO - Inicio de procesamiento');
    const startTime = Date.now();
    
    const requestData = await req.json();
    const { 
      content, 
      content_type = 'text', 
      source_url = null, 
      parsing_options = {},
      validate_output = true,
      include_metadata = true 
    } = requestData;

    // Validación mejorada de entrada
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('El contenido es requerido y debe ser una cadena válida');
    }

    if (content.length > 50000) {
      throw new Error('El contenido es demasiado largo (máximo 50,000 caracteres)');
    }

    console.log('📄 Tipo de contenido:', content_type);
    console.log('📊 Longitud del contenido:', content.length);
    console.log('🔗 URL fuente:', source_url || 'No especificada');

    // Obtener credenciales
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de Supabase faltante');
    }

    // Verificar autenticación del usuario
    const authHeader = req.headers.get('authorization');
    let userId = null;
    let userPlan = 'free';
    
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
          
          // Obtener plan del usuario
          const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=plan`, {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            }
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.length > 0) {
              userPlan = profileData[0].plan || 'free';
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error verificando autenticación:', error.message);
      }
    }

    console.log('👤 Usuario:', userId ? `${userId} (${userPlan})` : 'Anónimo');

    // Límites por plan
    const planLimits = {
      free: { max_parsing_per_day: 10, max_content_length: 10000 },
      pro_monthly: { max_parsing_per_day: 100, max_content_length: 50000 },
      pro_annual: { max_parsing_per_day: 500, max_content_length: 50000 }
    };

    const currentLimits = planLimits[userPlan] || planLimits.free;
    
    if (content.length > currentLimits.max_content_length) {
      throw new Error(`Contenido demasiado largo para tu plan ${userPlan}. Máximo: ${currentLimits.max_content_length} caracteres.`);
    }

    // Pre-procesar contenido según el tipo
    const preprocessedContent = preprocessContent(content, content_type);
    console.log('🔄 Contenido preprocesado, longitud final:', preprocessedContent.length);

    // Generar ID único para esta operación de parsing
    const parseId = crypto.randomUUID();
    
    // Registrar operación de parsing
    const operationMetadata = {
      parse_id: parseId,
      user_id: userId,
      user_plan: userPlan,
      content_type,
      content_length: content.length,
      source_url,
      parsing_options,
      timestamp: new Date().toISOString(),
      user_agent: req.headers.get('user-agent') || 'unknown'
    };

    console.log('🔖 Iniciando parsing con IA optimizada...');
    
    // Realizar parsing con IA
    const parseResult = await performOptimizedParsing(
      preprocessedContent, 
      content_type, 
      parsing_options,
      userPlan
    );
    
    console.log('✨ Parsing completado, resultados encontrados:', parseResult.convocatorias.length);

    // Validar resultados si se solicita
    let validationResults = null;
    if (validate_output && parseResult.convocatorias.length > 0) {
      console.log('✅ Validando resultados...');
      validationResults = await validateParsingResults(parseResult.convocatorias);
    }

    // Enriquecer resultados con metadatos
    const enrichedResults = parseResult.convocatorias.map((conv, index) => ({
      ...conv,
      metadata: {
        parse_id: parseId,
        extraction_confidence: conv.confidence || 0.8,
        validation_score: validationResults ? validationResults[index]?.score || 0.7 : null,
        source_info: {
          url: source_url,
          content_type,
          extracted_at: new Date().toISOString()
        },
        processing_info: {
          user_plan: userPlan,
          ai_model: parseResult.ai_model_used,
          processing_time_ms: Date.now() - startTime
        }
      }
    }));

    // Guardar en historial si el usuario está autenticado
    if (userId && enrichedResults.length > 0) {
      try {
        await saveParsingHistory(supabaseUrl, serviceRoleKey, {
          parse_id: parseId,
          user_id: userId,
          content_preview: content.substring(0, 200),
          results_count: enrichedResults.length,
          source_url,
          metadata: operationMetadata
        });
      } catch (saveError) {
        console.warn('⚠️ Error guardando historial:', saveError.message);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Parsing completado exitosamente en ${processingTime}ms`);

    const response = {
      data: {
        parse_id: parseId,
        convocatorias: enrichedResults,
        parsing_info: {
          total_found: enrichedResults.length,
          content_type,
          source_url,
          processing_time_ms: processingTime,
          ai_model_used: parseResult.ai_model_used,
          user_plan: userPlan,
          validation_performed: !!validationResults
        }
      }
    };

    // Incluir metadatos adicionales si se solicita
    if (include_metadata) {
      response.data.metadata = {
        operation: operationMetadata,
        validation_results: validationResults,
        parsing_statistics: parseResult.statistics
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ ERROR en parse-content-optimized:', error);

    const errorResponse = {
      error: {
        code: 'PARSE_CONTENT_OPTIMIZED_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
        type: error.name || 'UnknownError'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Pre-procesar contenido según el tipo
function preprocessContent(content: string, contentType: string): string {
  let processed = content.trim();
  
  switch (contentType) {
    case 'html':
      // Limpiar HTML y extraer texto
      processed = processed
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      break;
      
    case 'pdf':
      // El contenido ya viene extraído, solo limpiar
      processed = processed
        .replace(/\f/g, '\n') // Form feed to newline
        .replace(/\r\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();
      break;
      
    case 'url':
      // Contenido web, limpiar marcado
      processed = processed
        .replace(/\[.*?\]/g, '') // Remove markdown links
        .replace(/\s+/g, ' ')
        .trim();
      break;
      
    default:
      // Texto plano, limpieza mínima
      processed = processed
        .replace(/\s+/g, ' ')
        .trim();
  }
  
  return processed;
}

// Realizar parsing optimizado con IA
async function performOptimizedParsing(content: string, contentType: string, options: any, userPlan: string) {
  const openRouterKey = await getOpenRouterApiKey();
  
  if (!openRouterKey) {
    console.warn('⚠️ API key no disponible, usando parser de reglas');
    return performRuleBasedParsing(content, contentType);
  }

  const model = userPlan.includes('pro') ? 'deepseek/deepseek-r1' : 'google/gemini-flash-1.5';
  const maxTokens = userPlan.includes('pro') ? 4000 : 2000;
  
  const systemPrompt = createParsingSystemPrompt(contentType, options);
  const userPrompt = createParsingUserPrompt(content, contentType);
  
  try {
    console.log(`🤖 Usando modelo: ${model} (plan: ${userPlan})`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://convocatorias-pro.cl',
        'X-Title': 'ConvocatoriasPro - Content Parser'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.1, // Baja temperatura para consistencia
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('Respuesta vacía de IA');
    }

    // Parsear respuesta JSON
    const parseResult = parseAIParsingResponse(aiResponse);
    
    return {
      convocatorias: parseResult.convocatorias || [],
      ai_model_used: model,
      statistics: {
        input_length: content.length,
        output_count: parseResult.convocatorias?.length || 0,
        confidence_avg: parseResult.convocatorias?.reduce((acc, c) => acc + (c.confidence || 0.8), 0) / (parseResult.convocatorias?.length || 1)
      }
    };
    
  } catch (error) {
    console.error('Error en parsing con IA:', error);
    console.log('🔄 Fallback a parser de reglas');
    return performRuleBasedParsing(content, contentType);
  }
}

// Crear system prompt para parsing
function createParsingSystemPrompt(contentType: string, options: any): string {
  return `Eres un experto en extracción de información de convocatorias chilenas. Tu tarea es analizar contenido y extraer convocatorias estructuradas.

TIPOS DE CONTENIDO SOPORTADOS:
- Texto plano: Comunicados, anuncios
- HTML: Páginas web de instituciones
- PDF: Documentos oficiales
- URL: Contenido web extraído

CAMPOS A EXTRAER:
- nombre_concurso: Título exacto de la convocatoria
- institucion: Organización responsable
- fecha_apertura: Fecha de inicio (YYYY-MM-DD)
- fecha_cierre: Fecha límite (YYYY-MM-DD)
- monto_financiamiento: Monto disponible
- area: Área temática
- requisitos: Lista de requisitos principales
- descripcion: Descripción detallada
- fuente: URL o referencia del documento

FORMATO DE RESPUESTA:
{
  "convocatorias": [
    {
      "nombre_concurso": "string",
      "institucion": "string",
      "fecha_apertura": "YYYY-MM-DD",
      "fecha_cierre": "YYYY-MM-DD",
      "monto_financiamiento": "string",
      "area": "string",
      "requisitos": ["string"],
      "descripcion": "string",
      "fuente": "string",
      "confidence": 0.9
    }
  ]
}

IMPORTANTE:
- Solo extraer convocatorias reales encontradas en el contenido
- No inventar información faltante
- Asignar confidence score (0.0-1.0) basado en claridad de la información
- Retornar JSON válido siempre`;
}

// Crear user prompt para parsing
function createParsingUserPrompt(content: string, contentType: string): string {
  return `Analiza el siguiente contenido de tipo "${contentType}" y extrae todas las convocatorias encontradas:

---INICIO DEL CONTENIDO---
${content}
---FIN DEL CONTENIDO---

Extrae todas las convocatorias encontradas en formato JSON. Si no encuentras convocatorias, retorna un array vacío.`;
}

// Parser basado en reglas como fallback
function performRuleBasedParsing(content: string, contentType: string) {
  console.log('🔍 Ejecutando parser basado en reglas...');
  
  const convocatorias = [];
  const lines = content.split('\n');
  
  // Patrones comunes para detectar convocatorias
  const patterns = {
    convocatoria: /(?:convocatoria|concurso|llamado|fondo)\s+([^\n]+)/gi,
    fecha: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g,
    monto: /\$\s*([\d\.,]+)|([\d\.,]+)\s*(?:millones?|pesos|clp|uf)/gi,
    institucion: /(?:corfo|anid|conicyt|fondecyt|sercotec|fia|minciencia)/gi
  };
  
  let currentConvocatoria = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.length < 10) continue;
    
    // Detectar inicio de convocatoria
    const convMatch = line.match(patterns.convocatoria);
    if (convMatch) {
      // Guardar convocatoria anterior si existe
      if (currentConvocatoria && currentConvocatoria.nombre_concurso) {
        convocatorias.push(currentConvocatoria);
      }
      
      // Iniciar nueva convocatoria
      currentConvocatoria = {
        nombre_concurso: convMatch[1].trim(),
        institucion: '',
        fecha_apertura: null,
        fecha_cierre: null,
        monto_financiamiento: '',
        area: '',
        requisitos: [],
        descripcion: line,
        fuente: '',
        confidence: 0.6
      };
      
      // Buscar institución en la misma línea
      const instMatch = line.match(patterns.institucion);
      if (instMatch) {
        currentConvocatoria.institucion = instMatch[0].toUpperCase();
      }
    }
    
    // Si tenemos una convocatoria activa, buscar más información
    if (currentConvocatoria) {
      // Buscar fechas
      const fechas = line.match(patterns.fecha);
      if (fechas) {
        if (!currentConvocatoria.fecha_cierre) {
          currentConvocatoria.fecha_cierre = normalizeFecha(fechas[fechas.length - 1]);
        }
        if (fechas.length > 1 && !currentConvocatoria.fecha_apertura) {
          currentConvocatoria.fecha_apertura = normalizeFecha(fechas[0]);
        }
      }
      
      // Buscar montos
      const montos = line.match(patterns.monto);
      if (montos && !currentConvocatoria.monto_financiamiento) {
        currentConvocatoria.monto_financiamiento = montos[0];
      }
      
      // Añadir a descripción si es relevante
      if (line.length > 20 && currentConvocatoria.descripcion.length < 500) {
        currentConvocatoria.descripcion += ' ' + line;
      }
    }
  }
  
  // Guardar última convocatoria
  if (currentConvocatoria && currentConvocatoria.nombre_concurso) {
    convocatorias.push(currentConvocatoria);
  }
  
  return {
    convocatorias: convocatorias.slice(0, 5), // Máximo 5 para fallback
    ai_model_used: 'rule_based_parser',
    statistics: {
      input_length: content.length,
      output_count: convocatorias.length,
      confidence_avg: 0.6
    }
  };
}

// Normalizar fecha a formato YYYY-MM-DD
function normalizeFecha(fechaStr: string): string {
  try {
    const fecha = new Date(fechaStr.replace(/[\/\-]/g, '/'));
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// Parsear respuesta de IA
function parseAIParsingResponse(aiResponse: string) {
  try {
    // Buscar JSON en la respuesta
    let jsonStr = aiResponse.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const result = JSON.parse(jsonStr);
    
    // Validar estructura
    if (!result.convocatorias || !Array.isArray(result.convocatorias)) {
      throw new Error('Estructura de respuesta inválida');
    }
    
    return result;
    
  } catch (error) {
    console.error('Error parseando respuesta de IA:', error);
    return { convocatorias: [] };
  }
}

// Validar resultados de parsing
async function validateParsingResults(convocatorias: any[]): Promise<any[]> {
  return convocatorias.map(conv => {
    let score = 0;
    const checks = [];
    
    // Validar nombre
    if (conv.nombre_concurso && conv.nombre_concurso.length > 5) {
      score += 0.3;
      checks.push('nombre_valido');
    }
    
    // Validar institución
    if (conv.institucion && conv.institucion.length > 2) {
      score += 0.2;
      checks.push('institucion_valida');
    }
    
    // Validar fecha de cierre
    if (conv.fecha_cierre) {
      const fecha = new Date(conv.fecha_cierre);
      if (!isNaN(fecha.getTime()) && fecha > new Date()) {
        score += 0.3;
        checks.push('fecha_cierre_valida');
      }
    }
    
    // Validar descripción
    if (conv.descripcion && conv.descripcion.length > 20) {
      score += 0.2;
      checks.push('descripcion_valida');
    }
    
    return {
      score: Math.round(score * 100) / 100,
      checks,
      is_valid: score >= 0.6
    };
  });
}

// Obtener API key de OpenRouter
async function getOpenRouterApiKey(): Promise<string | null> {
  const fallbackKey = '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';
  
  // Intentar desde variables de entorno
  const envKey = Deno.env.get('OPENROUTER_API_KEY');
  if (envKey) {
    return envKey;
  }
  
  // Usar clave de fallback
  return fallbackKey;
}

// Guardar historial de parsing
async function saveParsingHistory(supabaseUrl: string, serviceRoleKey: string, data: any) {
  await fetch(`${supabaseUrl}/rest/v1/parsing_history`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
}