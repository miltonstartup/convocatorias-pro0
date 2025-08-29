// Edge Function: parse-content-test
// Parser Agent con IA real usando OpenRouter (versión temporal con API key)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ParseRequest {
  content: string
  fileType?: string
  source: 'file' | 'clipboard' | 'url'
}

interface ConvocatoriaData {
  nombre_concurso: string
  institucion: string
  fecha_cierre: string
  fecha_apertura?: string
  fecha_resultados?: string
  monto_financiamiento?: string
  requisitos?: string
  estado: 'abierto' | 'cerrado' | 'en_evaluacion' | 'finalizado'
  descripcion?: string
  contacto?: string
  sitio_web?: string
  area?: string
  tipo_fondo?: string
  fuente?: string
}

interface ParseResult {
  success: boolean
  convocatorias?: ConvocatoriaData[]
  confidence: number
  warnings: string[]
  errors?: string[]
  message?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticación requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Verificar plan del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, convocatorias_count')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil de usuario no encontrado' }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Verificar límites del plan
    if (profile.plan === 'free') {
      return new Response(
        JSON.stringify({ 
          error: 'Esta funcionalidad requiere plan Pro',
          upgrade_required: true 
        }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Obtener los datos del request
    const { content, fileType, source }: ParseRequest = await req.json()

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          confidence: 0,
          warnings: ['Contenido vacío'],
          errors: ['No se proporcionó contenido para analizar']
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Configurar OpenRouter API key (temporal)
    const openrouterApiKey = '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'
    
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key no configurada')
    }

    // Prompt para el análisis con IA
    const prompt = `Eres un experto parser de convocatorias de financiamiento. Analiza el siguiente contenido y extrae información estructurada sobre convocatorias, concursos o fondos de financiamiento.

Contenido a analizar:
${content}

Extrae la siguiente información en formato JSON:
- nombre_concurso: nombre del concurso/convocatoria
- institucion: organización que convoca
- fecha_cierre: fecha límite de postulación (formato YYYY-MM-DD HH:mm:ss)
- fecha_apertura: fecha de apertura (si está disponible)
- fecha_resultados: fecha de resultados (si está disponible)
- monto_financiamiento: monto máximo de financiamiento
- requisitos: requisitos principales
- estado: 'abierto', 'cerrado', 'en_evaluacion', 'finalizado'
- descripcion: descripción breve
- contacto: información de contacto
- sitio_web: sitio web oficial
- area: área temática (innovación, cultura, emprendimiento, etc.)
- tipo_fondo: tipo de fondo (semilla, desarrollo, etc.)

Responde solo con un JSON válido con un array 'convocatorias' y un campo 'confidence' (0-100).`

    // Llamada a OpenRouter
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://convocatoriaspro.cl',
        'X-Title': 'ConvocatoriasPro Parser'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    })

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text()
      console.error('Error OpenRouter:', errorText)
      throw new Error(`Error en OpenRouter: ${openrouterResponse.status}`)
    }

    const aiResponse = await openrouterResponse.json()
    const aiContent = aiResponse.choices[0]?.message?.content

    if (!aiContent) {
      throw new Error('No se recibió respuesta válida de la IA')
    }

    // Parsear la respuesta JSON de la IA
    let parsedResult
    try {
      parsedResult = JSON.parse(aiContent)
    } catch (e) {
      // Si no es JSON válido, intentar extraer JSON del texto
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('La IA no devolvió un JSON válido')
      }
    }

    const result: ParseResult = {
      success: true,
      convocatorias: parsedResult.convocatorias || [],
      confidence: parsedResult.confidence || 80,
      warnings: [],
      message: `Se procesó contenido desde ${source}`
    }

    // Agregar advertencias según el contenido
    if (content.length < 50) {
      result.warnings.push('Contenido muy corto, puede ser información incompleta')
    }

    if (result.convocatorias && result.convocatorias.length === 0) {
      result.warnings.push('No se detectaron convocatorias en el contenido')
      result.confidence = Math.max(result.confidence - 30, 0)
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en parse-content:', error)
    
    const errorResult: ParseResult = {
      success: false,
      confidence: 0,
      warnings: [],
      errors: [error.message || 'Error interno del servidor'],
      message: 'Error al procesar el contenido'
    }

    return new Response(
      JSON.stringify(errorResult),
      { status: 500, headers: corsHeaders }
    )
  }
})