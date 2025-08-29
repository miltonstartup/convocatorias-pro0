// Edge Function: parse-content
// Parser Agent con IA real usando OpenRouter para detectar convocatorias

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
      .select('plan')
      .eq('id', user.id)
      .single()

    if (!profile || profile.plan === 'free') {
      return new Response(
        JSON.stringify({ 
          error: 'Esta funcionalidad requiere plan Pro',
          upgrade_required: true
        }),
        { status: 403, headers: corsHeaders }
      )
    }

    const { content, fileType = 'text', source }: ParseRequest = await req.json()

    if (!content || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          errors: ['Contenido vacío'],
          message: 'No se proporcionó contenido para analizar'
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Preparar prompt para OpenRouter AI
    const systemPrompt = `Eres un experto en análisis de convocatorias de financiamiento en Chile. Tu tarea es extraer información estructurada sobre convocatorias desde texto no estructurado.

Campos requeridos (obligatorios):
- nombre_concurso: Nombre oficial del concurso/convocatoria
- institucion: Organización que convoca (CORFO, SERCOTEC, etc.)
- fecha_cierre: Fecha límite en formato YYYY-MM-DD

Campos opcionales:
- fecha_apertura: Fecha de inicio en formato YYYY-MM-DD  
- fecha_resultados: Fecha de resultados en formato YYYY-MM-DD
- monto_financiamiento: Monto en pesos chilenos
- requisitos: Requisitos principales
- estado: abierto/cerrado/en_evaluacion/finalizado
- descripcion: Resumen de la convocatoria
- contacto: Email o teléfono de contacto
- sitio_web: URL oficial
- area: Área temática (tecnología, innovación, etc.)
- tipo_fondo: Tipo de financiamiento
- fuente: Origen de la información

Responde SOLO con JSON válido en este formato:
{
  "convocatorias": [
    {
      "nombre_concurso": "string",
      "institucion": "string",
      "fecha_cierre": "YYYY-MM-DD",
      ...
    }
  ],
  "confidence": 0.85
}`

    const userPrompt = `Analiza el siguiente contenido de ${source} (${fileType}) y extrae todas las convocatorias de financiamiento que encuentres:\n\n${content.slice(0, 8000)}`

    // Llamar a OpenRouter
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': 'https://convocatoriaspro.com',
        'X-Title': 'ConvocatoriasPro Parser Agent'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    })

    if (!openrouterResponse.ok) {
      throw new Error(`Error en OpenRouter: ${openrouterResponse.status}`)
    }

    const aiResponse = await openrouterResponse.json()
    const aiContent = aiResponse.choices[0]?.message?.content

    if (!aiContent) {
      throw new Error('No se recibió respuesta de la IA')
    }

    // Parsear respuesta JSON de la IA
    let parsedResult
    try {
      // Limpiar respuesta en caso de que venga con markdown
      const cleanContent = aiContent.replace(/```json\n?|```/g, '').trim()
      parsedResult = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Error parsing AI response:', aiContent)
      throw new Error('Error al procesar respuesta de la IA')
    }

    const convocatorias = parsedResult.convocatorias || []
    const confidence = parsedResult.confidence || 0.5
    const warnings: string[] = []

    // Validar y limpiar datos extraídos
    const validConvocatorias = convocatorias.filter((conv: any) => {
      if (!conv.nombre_concurso || !conv.institucion || !conv.fecha_cierre) {
        warnings.push(`Convocatoria incompleta ignorada: ${conv.nombre_concurso || 'Sin nombre'}`)
        return false
      }
      
      // Validar formato de fecha
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!fechaRegex.test(conv.fecha_cierre)) {
        warnings.push(`Fecha inválida en: ${conv.nombre_concurso}`)
        return false
      }
      
      return true
    })

    if (validConvocatorias.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: ['No se encontraron convocatorias válidas en el contenido'],
          warnings,
          message: 'El contenido no contiene convocatorias detectables'
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    const result: ParseResult = {
      success: true,
      convocatorias: validConvocatorias,
      confidence,
      warnings
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en parse-content:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        message: 'Error al procesar el contenido'
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})