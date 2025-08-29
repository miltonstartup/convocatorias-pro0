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
        const requestData = await req.json();
        const { action } = requestData;

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Obtener usuario autenticado
        let userId = 'default-user';
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
                }
            } catch (authError) {
                console.warn('⚠️ Error de autenticación, usando usuario por defecto');
            }
        }

        switch (action) {
            case 'get':
                return await getPrompts(supabaseUrl, serviceRoleKey, userId);
                
            case 'save':
                const { prompt_type, custom_prompt } = requestData;
                return await savePrompt(supabaseUrl, serviceRoleKey, userId, prompt_type, custom_prompt);
                
            case 'reset':
                const { prompt_type: resetType } = requestData;
                return await resetPrompt(supabaseUrl, serviceRoleKey, userId, resetType);
                
            case 'preview':
                const { prompt_type: previewType, custom_prompt: previewPrompt } = requestData;
                return await previewPrompt(previewType, previewPrompt);
                
            default:
                throw new Error('Acción no válida');
        }

    } catch (error) {
        console.error('❌ ERROR en prompt-editor:', error);
        
        return new Response(JSON.stringify({
            error: {
                code: 'PROMPT_EDITOR_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Prompts por defecto
const DEFAULT_PROMPTS = {
    openrouter: {
        title: 'OpenRouter - Modelos Múltiples',
        description: 'Prompt para búsqueda con múltiples modelos de OpenRouter',
        default_prompt: `Actúa como un asistente especializado en financiamiento de proyectos. Proporciona una lista detallada, organizada y actualizada de oportunidades de financiamiento, concursos, becas o subvenciones disponibles para [CONSULTA_USUARIO], priorizando oportunidades en Chile PRIMERO, luego incluyendo opciones internacionales relevantes.

Para cada oportunidad, incluye la siguiente información:
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
- Asegúrate de que toda la información sea válida para 2025 o la fecha más reciente disponible`
    },
    
    gemini_flash: {
        title: 'Gemini 2.5 Flash-Lite - Paso 1',
        description: 'Prompt para generación rápida de lista inicial (Paso 1 del flujo inteligente)',
        default_prompt: `Genera una lista con viñetas de posibles nombres de programas, becas o concursos de financiamiento para "[CONSULTA_USUARIO]" [UBICACION_DETECTADA].

No des detalles, solo los nombres y organizaciones. Formato:
• Nombre del Programa - Organización
• Nombre del Programa - Organización

Ejemplo:
• Fondo de Innovación para la Competitividad - CORFO
• Becas Chile - ANID
• Horizonte Europa - Comisión Europea

Genera entre 8-15 oportunidades relevantes. Solo nombres, sin descripciones.`
    },
    
    gemini_pro: {
        title: 'Gemini 2.5 Pro - Paso 2',
        description: 'Prompt para análisis detallado usando lista del Paso 1 (Flujo inteligente)',
        default_prompt: `Usando la siguiente lista de posibles oportunidades:

[LISTA_PASO_1]

Actúa como un asistente especializado en financiamiento de proyectos. Proporciona una lista detallada, organizada y actualizada de oportunidades de financiamiento, concursos, becas o subvenciones disponibles para "[CONSULTA_USUARIO]", [UBICACION_DETECTADA].

Para cada oportunidad, incluye la siguiente información:
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
- Asegúrate de que toda la información sea válida para 2025 o la fecha más reciente disponible

Devuelve la respuesta en formato JSON válido con esta estructura:
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
}`
    }
};

// Obtener todos los prompts del usuario
async function getPrompts(supabaseUrl: string, serviceRoleKey: string, userId: string) {
    try {
        console.log('📝 Obteniendo prompts para usuario:', userId);
        
        // Obtener prompts personalizados del usuario
        const response = await fetch(`${supabaseUrl}/rest/v1/user_custom_prompts?user_id=eq.${userId}&is_active=eq.true`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });
        
        const customPrompts = response.ok ? await response.json() : [];
        console.log('📊 Prompts personalizados encontrados:', customPrompts.length);
        
        // Combinar prompts por defecto con personalizados
        const prompts: any = {};
        
        for (const [type, defaultData] of Object.entries(DEFAULT_PROMPTS)) {
            const customPrompt = customPrompts.find((p: any) => p.prompt_type === type);
            
            prompts[type] = {
                ...defaultData,
                current_prompt: customPrompt ? customPrompt.custom_prompt : defaultData.default_prompt,
                is_custom: !!customPrompt,
                char_count: customPrompt ? customPrompt.custom_prompt.length : defaultData.default_prompt.length,
                last_modified: customPrompt ? customPrompt.updated_at : null
            };
        }
        
        return new Response(JSON.stringify({
            data: { prompts }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo prompts:', error);
        throw error;
    }
}

// Guardar prompt personalizado
async function savePrompt(
    supabaseUrl: string, 
    serviceRoleKey: string, 
    userId: string, 
    promptType: string, 
    customPrompt: string
) {
    try {
        console.log('💾 Guardando prompt personalizado:', { promptType, userId });
        
        if (!customPrompt || customPrompt.trim().length === 0) {
            throw new Error('El prompt personalizado no puede estar vacío');
        }
        
        if (!DEFAULT_PROMPTS[promptType as keyof typeof DEFAULT_PROMPTS]) {
            throw new Error('Tipo de prompt no válido');
        }
        
        const promptData = {
            user_id: userId,
            prompt_type: promptType,
            custom_prompt: customPrompt.trim(),
            is_active: true,
            updated_at: new Date().toISOString()
        };
        
        // Upsert (insertar o actualizar)
        const response = await fetch(`${supabaseUrl}/rest/v1/user_custom_prompts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(promptData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error guardando prompt:', errorText);
            throw new Error('No se pudo guardar el prompt personalizado');
        }
        
        console.log('✅ Prompt personalizado guardado exitosamente');
        
        return new Response(JSON.stringify({
            data: {
                success: true,
                prompt_type: promptType,
                char_count: customPrompt.length,
                saved_at: new Date().toISOString()
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error guardando prompt:', error);
        throw error;
    }
}

// Restablecer prompt a configuración por defecto
async function resetPrompt(
    supabaseUrl: string, 
    serviceRoleKey: string, 
    userId: string, 
    promptType: string
) {
    try {
        console.log('🔄 Restableciendo prompt:', { promptType, userId });
        
        if (!DEFAULT_PROMPTS[promptType as keyof typeof DEFAULT_PROMPTS]) {
            throw new Error('Tipo de prompt no válido');
        }
        
        // Eliminar prompt personalizado
        const response = await fetch(
            `${supabaseUrl}/rest/v1/user_custom_prompts?user_id=eq.${userId}&prompt_type=eq.${promptType}`, 
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.warn('No se pudo eliminar prompt personalizado (quizás no existía)');
        }
        
        console.log('✅ Prompt restablecido a configuración por defecto');
        
        return new Response(JSON.stringify({
            data: {
                success: true,
                prompt_type: promptType,
                reset_to_default: true,
                reset_at: new Date().toISOString()
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error restableciendo prompt:', error);
        throw error;
    }
}

// Vista previa de prompt
async function previewPrompt(promptType: string, customPrompt: string) {
    try {
        console.log('👁️ Generando vista previa:', { promptType });
        
        if (!customPrompt || customPrompt.trim().length === 0) {
            throw new Error('Prompt requerido para vista previa');
        }
        
        const text = customPrompt.trim();
        const charCount = text.length;
        const wordCount = text.split(/\s+/).length;
        const estimatedTokens = Math.ceil(charCount / 4); // Estimación aproximada
        
        // Buscar variables
        const variableRegex = /\[([A-Z_]+)\]/g;
        const variablesFound = [];
        let match;
        
        while ((match = variableRegex.exec(text)) !== null) {
            if (!variablesFound.includes(match[1])) {
                variablesFound.push(match[1]);
            }
        }
        
        // Generar ejemplo con consulta
        const exampleQuery = 'financiamiento para startups tecnológicas';
        let exampleText = text
            .replace(/\[CONSULTA_USUARIO\]/g, exampleQuery)
            .replace(/\[UBICACION_DETECTADA\]/g, 'priorizando Chile')
            .replace(/\[LISTA_PASO_1\]/g, '• Fondo de Innovación - CORFO\n• Becas Chile - ANID');
        
        // Truncar ejemplo si es muy largo
        if (exampleText.length > 500) {
            exampleText = exampleText.substring(0, 497) + '...';
        }
        
        // Calcular puntuación de calidad simple
        let qualityScore = 70; // Base
        if (variablesFound.length > 0) qualityScore += 10;
        if (text.includes('JSON')) qualityScore += 10;
        if (text.includes('fecha') || text.includes('deadline')) qualityScore += 5;
        if (text.includes('organización') || text.includes('organismo')) qualityScore += 5;
        
        qualityScore = Math.min(qualityScore, 100);
        
        const previewData = {
            prompt_type: promptType,
            char_count: charCount,
            word_count: wordCount,
            variables_found: variablesFound,
            example_with_query: exampleText,
            estimated_tokens: estimatedTokens,
            quality_score: qualityScore
        };
        
        return new Response(JSON.stringify({
            data: { preview: previewData }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error en vista previa:', error);
        throw error;
    }
}