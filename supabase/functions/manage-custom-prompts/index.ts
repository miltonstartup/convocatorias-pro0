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
        console.log('🔧 GESTIÓN PROMPTS PERSONALIZADOS - Procesamiento iniciado');
        
        const { action, prompt_type, custom_prompt } = await req.json();

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

        if (!serviceRoleKey || !supabaseUrl || !anonKey) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Obtener usuario desde auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Token de autorización requerido');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Usar anon key para validar el usuario (RLS requiere contexto de usuario)
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey // Usar anon key en lugar de service role
            }
        });
        
        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.log('🔍 Auth Error Details:', errorText);
            throw new Error(`Token no válido: ${userResponse.status}`);
        }
        
        const userData = await userResponse.json();
        const userId = userData.id;
        console.log('👤 Usuario autenticado exitosamente:', userId);

        switch (action) {
            case 'get':
                return await getCustomPrompts(userId, supabaseUrl, serviceRoleKey, corsHeaders);
            
            case 'save':
                if (!prompt_type || !custom_prompt) {
                    throw new Error('prompt_type y custom_prompt son requeridos');
                }
                return await saveCustomPrompt(userId, prompt_type, custom_prompt, supabaseUrl, serviceRoleKey, corsHeaders);
            
            case 'reset':
                if (!prompt_type) {
                    throw new Error('prompt_type es requerido para restablecer');
                }
                return await deleteCustomPrompt(userId, prompt_type, supabaseUrl, serviceRoleKey, corsHeaders);
            
            case 'preview':
                if (!prompt_type || !custom_prompt) {
                    throw new Error('prompt_type y custom_prompt son requeridos para vista previa');
                }
                return await previewPrompt(prompt_type, custom_prompt, corsHeaders);
            
            default:
                throw new Error('Acción no soportada');
        }

    } catch (error) {
        console.error('❌ ERROR en gestión de prompts:', error);
        
        return new Response(JSON.stringify({
            error: {
                code: 'PROMPT_MANAGEMENT_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Obtener prompts personalizados del usuario
async function getCustomPrompts(userId: string, supabaseUrl: string, anonKey: string, token: string, corsHeaders: any) {
    console.log('📖 Obteniendo prompts personalizados para usuario:', userId);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/user_custom_prompts?user_id=eq.${userId}&is_active=eq.true`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Usar token del usuario
            'apikey': anonKey, // Usar anon key para RLS
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error obteniendo prompts: ${errorText}`);
    }

    const prompts = await response.json();
    
    // Incluir prompts por defecto si no existen personalizados
    const defaultPrompts = getDefaultPrompts();
    const result: any = {};
    
    // Crear estructura completa para cada tipo de prompt
    Object.entries(defaultPrompts).forEach(([type, data]: [string, any]) => {
        result[type] = {
            title: getPromptTitle(type),
            description: getPromptDescription(type),
            default_prompt: data.prompt,
            current_prompt: data.prompt,
            is_custom: false,
            char_count: data.prompt.length,
            last_modified: null
        };
    });
    
    // Sobrescribir con prompts personalizados
    prompts.forEach((prompt: any) => {
        if (result[prompt.prompt_type]) {
            result[prompt.prompt_type] = {
                ...result[prompt.prompt_type],
                current_prompt: prompt.custom_prompt,
                is_custom: true,
                char_count: prompt.custom_prompt.length,
                last_modified: prompt.updated_at
            };
        }
    });

    console.log('✅ Prompts obtenidos:', Object.keys(result).length);
    
    return new Response(JSON.stringify({
        data: {
            prompts: result
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Guardar prompt personalizado
async function saveCustomPrompt(userId: string, promptType: string, customPrompt: string, supabaseUrl: string, anonKey: string, token: string, corsHeaders: any) {
    console.log('💾 Guardando prompt personalizado:', { userId, promptType });
    
    const response = await fetch(`${supabaseUrl}/rest/v1/user_custom_prompts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`, // Usar token del usuario
            'apikey': anonKey, // Usar anon key para RLS
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
            user_id: userId,
            prompt_type: promptType,
            custom_prompt: customPrompt,
            is_active: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error guardando prompt: ${errorText}`);
    }

    console.log('✅ Prompt personalizado guardado exitosamente');
    
    return new Response(JSON.stringify({
        data: {
            success: true,
            message: 'Prompt personalizado guardado exitosamente'
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Eliminar prompt personalizado (restaurar a default)
async function deleteCustomPrompt(userId: string, promptType: string, supabaseUrl: string, anonKey: string, token: string, corsHeaders: any) {
    console.log('🗑️ Eliminando prompt personalizado:', { userId, promptType });
    
    const response = await fetch(`${supabaseUrl}/rest/v1/user_custom_prompts?user_id=eq.${userId}&prompt_type=eq.${promptType}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`, // Usar token del usuario
            'apikey': anonKey, // Usar anon key para RLS
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error eliminando prompt: ${errorText}`);
    }

    console.log('✅ Prompt personalizado eliminado, restaurado a default');
    
    return new Response(JSON.stringify({
        data: {
            success: true,
            message: 'Prompt restaurado a configuración por defecto'
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Vista previa de prompt
async function previewPrompt(promptType: string, customPrompt: string, corsHeaders: any) {
    console.log('👁️ Generando vista previa para prompt:', promptType);
    
    // Calcular métricas del prompt
    const charCount = customPrompt.length;
    const wordCount = customPrompt.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedTokens = Math.ceil(charCount / 4);
    
    // Buscar variables en el prompt
    const variableRegex = /\[([A-Z_]+)\]/g;
    const variables = [];
    let match;
    while ((match = variableRegex.exec(customPrompt)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }
    
    // Calcular puntuación de calidad básica
    let qualityScore = 60; // Base
    if (variables.length > 0) qualityScore += 20;
    if (charCount > 100) qualityScore += 10;
    if (charCount < 2000) qualityScore += 10;
    
    // Ejemplo con consulta de prueba
    const exampleQuery = "becas para estudiantes universitarios";
    let exampleWithQuery = customPrompt.replace(/\[CONSULTA_USUARIO\]/g, exampleQuery);
    exampleWithQuery = exampleWithQuery.replace(/\[UBICACION_DETECTADA\]/g, "Chile");
    exampleWithQuery = exampleWithQuery.replace(/\[LISTA_PASO_1\]/g, "• Beca Nacional Chile - ANID\n• Fondo de Innovación - CORFO");
    
    // Limitar ejemplo a 200 caracteres
    if (exampleWithQuery.length > 200) {
        exampleWithQuery = exampleWithQuery.substring(0, 197) + "...";
    }
    
    const previewData = {
        prompt_type: promptType,
        char_count: charCount,
        word_count: wordCount,
        variables_found: variables,
        example_with_query: exampleWithQuery,
        estimated_tokens: estimatedTokens,
        quality_score: Math.min(qualityScore, 100)
    };
    
    console.log('✅ Vista previa generada exitosamente');
    
    return new Response(JSON.stringify({
        data: {
            preview: previewData
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Obtener título del prompt
function getPromptTitle(type: string): string {
    const titles: { [key: string]: string } = {
        'openrouter': 'OpenRouter - Búsqueda Completa',
        'gemini_flash': 'Gemini Flash - Lista Rápida',
        'gemini_pro': 'Gemini Pro - Análisis Detallado'
    };
    return titles[type] || 'Prompt Personalizado';
}

// Obtener descripción del prompt
function getPromptDescription(type: string): string {
    const descriptions: { [key: string]: string } = {
        'openrouter': 'Prompt principal para búsquedas completas de convocatorias',
        'gemini_flash': 'Prompt para generar lista inicial de oportunidades',
        'gemini_pro': 'Prompt para análisis detallado con formato JSON'
    };
    return descriptions[type] || 'Prompt personalizado del usuario';
}

// Prompts por defecto del sistema - VERSIÓN REFORZADA ANTI-INVENCIÓN
function getDefaultPrompts() {
    return {
        openrouter: {
            prompt: `ERES UN ASISTENTE ESPECIALIZADO EN FINANCIAMIENTO CON VALIDACIÓN ESTRICTA DE FUENTES.

🚨 REGLAS CRÍTICAS - NUNCA VIOLES ESTAS REGLAS:

1. PROHIBIDO INVENTAR DATOS:
   - NUNCA inventes montos, fechas, organizaciones o enlaces
   - NUNCA aproximes o estimes información
   - NUNCA generes URLs ficticios
   - Si no tienes el dato exacto, usa "NO DISPONIBLE"

2. TRAZABILIDAD OBLIGATORIA:
   - CADA dato debe tener su enlace específico de origen
   - El enlace debe corresponder exactamente con la información proporcionada
   - VERIFICA que el título, organismo y monto coincidan con el enlace

3. VERIFICACIÓN DE COHERENCIA:
   - Los datos del mismo programa deben ser consistentes entre sí
   - Las fechas deben ser lógicas (no pasadas para convocatorias "abiertas")
   - Los montos deben tener formato real (no inventados)

4. MARCADO DE INCERTIDUMBRE:
   - Si dudas de cualquier dato: "NO DISPONIBLE"
   - Si el enlace no corresponde: "FUENTE NO VERIFICABLE"
   - Si la información es contradictoria: "DATOS INCONSISTENTES"

Para cada oportunidad, incluye la siguiente información VERIFICABLE:
- Nombre de la Oportunidad (exacto del enlace)
- Organismo Convocante (real, no inventado)
- Descripción (literal del enlace o "Descripción no disponible en fuente")
- Monto de Financiamiento (exacto o "Monto no especificado en fuente")
- Fecha Límite (exacta YYYY-MM-DD o "Fecha no disponible en fuente")
- Elegibilidad (del enlace o "Requisitos no detallados en fuente")
- Enlace Oficial (REAL y ESPECÍFICO - nunca genéricos)
- Estado de Verificación (SI/NO para cada campo)

RECUERDA: Es mejor reportar "NO DISPONIBLE" que inventar información.
Tu credibilidad depende de la veracidad, no de la completitud.`,
            is_custom: false
        },
        gemini_flash: {
            prompt: `🚨 INSTRUCCIONES CRÍTICAS - NO INVENTES NADA:

Genera una lista con viñetas de programas de financiamiento REALES para [CONSULTA_USUARIO].

❌ PROHIBIDO:
- Inventar nombres de programas
- Crear organizaciones ficticias
- Aproximar o estimar
- Usar nombres genéricos como "Programa de Financiamiento"

✅ OBLIGATORIO:
- Solo programas que CONOCES que existen
- Solo organizaciones REALES verificables
- Si no estás seguro: NO lo incluyas
- Usar nombres EXACTOS de programas reales

Formato EXACTO:
• [NOMBRE REAL DEL PROGRAMA] - [ORGANIZACIÓN REAL]
• [NOMBRE REAL DEL PROGRAMA] - [ORGANIZACIÓN REAL]

Ejemplo de programas REALES verificados:
• Fondo de Innovación para la Competitividad - CORFO
• Becas Chile - ANID
• Horizonte Europa - Comisión Europea
• Fondo de Emprendimiento e Innovación - SERCOTEC
• Fondo de Innovación Agraria - FIA

⚠️ IMPORTANTE: Es mejor generar menos programas REALES que muchos INVENTADOS.
Si dudas de la existencia de algún programa: NO lo incluyas.`,
            is_custom: false
        },
        gemini_pro: {
            prompt: `🚨 VALIDACIÓN ESTRICTA DE FUENTES OBLIGATORIA:

Usando esta lista de programas REALES:
[LISTA_PASO_1]

Genera información VERIFICABLE sobre convocatorias de financiamiento para [CONSULTA_USUARIO].

❌ REGLAS CRÍTICAS - NUNCA VIOLES:
1. NUNCA inventes datos (montos, fechas, descripciones)
2. CADA dato DEBE tener su enlace de origen específico
3. Si no tienes el dato exacto: marca "NO DISPONIBLE"
4. NUNCA generes enlaces ficticios
5. VERIFICA que los datos coincidan con el enlace
6. NUNCA uses ejemplos genéricos como "$50.000.000"

Devuelve la respuesta en formato JSON válido con esta estructura:
{
  "convocatorias": [
    {
      "title": "[NOMBRE EXACTO - NO INVENTAR]",
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
      "status": "[ESTADO SEGÚN ENLACE: abierto/cerrado/próximo]",
      "tags": ["chile", "[CONSULTA_USUARIO]"],
      "reliability_score": "[50-95 según calidad de verificación]"
    }
  ]
}

🔍 PROCESO OBLIGATORIO:
1. Para cada programa, buscar enlace oficial específico
2. Extraer SOLO datos que aparecen literalmente en el enlace
3. Si un dato no está en el enlace: "NO DISPONIBLE EN FUENTE"
4. Documentar verificación en "data_verification"
5. Asignar "reliability_score" basado en verificación real

⚠️ RECUERDA: Es preferible reportar "NO DISPONIBLE" que inventar información.
Tu credibilidad depende de la veracidad, no de la completitud.`,
            is_custom: false
        }
    };
}