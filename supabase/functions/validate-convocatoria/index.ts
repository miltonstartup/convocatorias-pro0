// Edge Function: validate-convocatoria
// Validator Agent con IA real para verificar y mejorar datos de convocatorias

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ValidationRequest {
  convocatoria: {
    nombre_concurso?: string
    institucion?: string
    fecha_cierre?: string
    fecha_apertura?: string
    fecha_resultados?: string
    monto_financiamiento?: string
    requisitos?: string
    estado?: string
    descripcion?: string
    contacto?: string
    sitio_web?: string
    area?: string
    tipo_fondo?: string
  }
}

interface ValidationResult {
  isValid: boolean
  score: number
  errors: string[]
  warnings: string[]
  suggestions: string[]
  improvements: {
    field: string
    suggested_value: string
    reason: string
  }[]
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

    const { convocatoria }: ValidationRequest = await req.json()

    if (!convocatoria) {
      return new Response(
        JSON.stringify({ 
          isValid: false,
          score: 0,
          errors: ['No se proporcionó datos de convocatoria'],
          warnings: [],
          suggestions: [],
          improvements: []
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Validación básica local
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    let score = 0

    // Validar campos obligatorios
    if (!convocatoria.nombre_concurso || convocatoria.nombre_concurso.trim().length < 3) {
      errors.push('Nombre del concurso es obligatorio (mínimo 3 caracteres)')
    } else {
      score += 25
    }

    if (!convocatoria.institucion || convocatoria.institucion.trim().length < 2) {
      errors.push('Institución es obligatoria (mínimo 2 caracteres)')
    } else {
      score += 25
    }

    if (!convocatoria.fecha_cierre) {
      errors.push('Fecha de cierre es obligatoria')
    } else {
      // Validar formato de fecha
      const fechaRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!fechaRegex.test(convocatoria.fecha_cierre)) {
        errors.push('Fecha de cierre debe estar en formato YYYY-MM-DD')
      } else {
        // Verificar que no sea una fecha pasada
        const fechaCierre = new Date(convocatoria.fecha_cierre)
        const hoy = new Date()
        if (fechaCierre < hoy) {
          warnings.push('La fecha de cierre parece estar en el pasado')
        }
        score += 25
      }
    }

    // Validaciones opcionales que suman al score
    if (convocatoria.descripcion && convocatoria.descripcion.length > 10) score += 5
    if (convocatoria.monto_financiamiento) score += 5
    if (convocatoria.requisitos && convocatoria.requisitos.length > 10) score += 5
    if (convocatoria.contacto) score += 5
    if (convocatoria.sitio_web) score += 5
    if (convocatoria.area) score += 5

    // Si hay errores críticos, no usar IA
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          isValid: false,
          score: Math.min(score, 30), // Máximo 30 si hay errores
          errors,
          warnings,
          suggestions: ['Corrige los errores obligatorios antes de continuar'],
          improvements: []
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Usar IA para validación avanzada y sugerencias
    const systemPrompt = `Eres un experto validador de convocatorias de financiamiento en Chile. Analiza la siguiente convocatoria y proporciona:
1. Evaluación de la calidad de los datos
2. Sugerencias de mejora
3. Deteccción de inconsistencias
4. Recomendaciones de campos faltantes

Responde SOLO con JSON válido en este formato:
{
  "data_quality": 0.85,
  "warnings": ["advertencias sobre los datos"],
  "suggestions": ["sugerencias generales"],
  "improvements": [
    {
      "field": "campo_a_mejorar",
      "suggested_value": "valor_sugerido",
      "reason": "razón_de_la_mejora"
    }
  ]
}`

    const userPrompt = `Valida esta convocatoria chilena:\n\n${JSON.stringify(convocatoria, null, 2)}`

    // Llamar a OpenRouter para validación avanzada
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': 'https://convocatoriaspro.com',
        'X-Title': 'ConvocatoriasPro Validator Agent'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    let aiValidation = {
      data_quality: 0.7,
      warnings: [],
      suggestions: [],
      improvements: []
    }

    if (openrouterResponse.ok) {
      try {
        const aiResponse = await openrouterResponse.json()
        const aiContent = aiResponse.choices[0]?.message?.content
        
        if (aiContent) {
          const cleanContent = aiContent.replace(/```json\n?|```/g, '').trim()
          aiValidation = JSON.parse(cleanContent)
        }
      } catch (aiError) {
        console.error('Error parsing AI validation:', aiError)
        // Continuar con validación básica
      }
    }

    // Combinar validación local con IA
    const finalScore = Math.round((score + (aiValidation.data_quality * 100)) / 2)
    const isValid = errors.length === 0 && finalScore >= 60

    const result: ValidationResult = {
      isValid,
      score: Math.min(finalScore, 100),
      errors,
      warnings: [...warnings, ...aiValidation.warnings],
      suggestions: [...suggestions, ...aiValidation.suggestions],
      improvements: aiValidation.improvements || []
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en validate-convocatoria:', error)
    
    return new Response(
      JSON.stringify({
        isValid: false,
        score: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        warnings: [],
        suggestions: ['Intenta nuevamente o contacta soporte'],
        improvements: []
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})