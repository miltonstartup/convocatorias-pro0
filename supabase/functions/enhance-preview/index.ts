// Edge Function: enhance-preview
// Preview Agent con IA para generar vistas previas mejoradas y enriquecidas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PreviewRequest {
  convocatoria: {
    nombre_concurso: string
    institucion: string
    fecha_cierre: string
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

interface PreviewData {
  enhanced_description: string
  key_points: string[]
  timeline: Array<{
    date: string
    event: string
    importance: 'high' | 'medium' | 'low'
  }>
  requirements_summary: string[]
  estimated_competition: 'low' | 'medium' | 'high'
  target_audience: string[]
  success_tips: string[]
  similar_opportunities: string[]
  risk_assessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
  }
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

    const { convocatoria }: PreviewRequest = await req.json()

    if (!convocatoria || !convocatoria.nombre_concurso) {
      return new Response(
        JSON.stringify({
          enhanced_description: 'Error: No se proporcionó información de la convocatoria',
          key_points: [],
          timeline: [],
          requirements_summary: [],
          estimated_competition: 'medium' as const
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    // Preparar prompt para IA de preview mejorado
    const systemPrompt = `Eres un consultor experto en convocatorias de financiamiento en Chile. Tu tarea es analizar una convocatoria y generar una vista previa enriquecida que ayude a los usuarios a entender mejor la oportunidad.

Proporciona:
1. Descripción mejorada y atractiva
2. Puntos clave destacados
3. Cronograma de eventos importantes
4. Resumen de requisitos
5. Estimación de competencia
6. Público objetivo
7. Consejos para el éxito
8. Oportunidades similares
9. Evaluación de riesgos

Responde SOLO con JSON válido en este formato:
{
  "enhanced_description": "Descripción atractiva y profesional",
  "key_points": ["punto 1", "punto 2"],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "descripción del evento",
      "importance": "high/medium/low"
    }
  ],
  "requirements_summary": ["requisito 1", "requisito 2"],
  "estimated_competition": "low/medium/high",
  "target_audience": ["audiencia 1", "audiencia 2"],
  "success_tips": ["consejo 1", "consejo 2"],
  "similar_opportunities": ["oportunidad 1", "oportunidad 2"],
  "risk_assessment": {
    "level": "low/medium/high",
    "factors": ["factor 1", "factor 2"]
  }
}`

    const userPrompt = `Analiza esta convocatoria chilena y genera una vista previa enriquecida:\n\n${JSON.stringify(convocatoria, null, 2)}`

    // Llamar a OpenRouter para generar preview mejorado
    const openrouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'HTTP-Referer': 'https://convocatoriaspro.com',
        'X-Title': 'ConvocatoriasPro Preview Agent'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000
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
    let enhancedPreview: PreviewData
    try {
      const cleanContent = aiContent.replace(/```json\n?|```/g, '').trim()
      enhancedPreview = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Error parsing AI preview response:', aiContent)
      // Fallback a preview básico
      enhancedPreview = {
        enhanced_description: convocatoria.descripcion || `Convocatoria de ${convocatoria.institucion} - ${convocatoria.nombre_concurso}`,
        key_points: [
          `Institución: ${convocatoria.institucion}`,
          `Fecha límite: ${convocatoria.fecha_cierre}`,
          convocatoria.monto_financiamiento ? `Financiamiento: ${convocatoria.monto_financiamiento}` : 'Monto no especificado'
        ],
        timeline: [
          {
            date: convocatoria.fecha_cierre,
            event: 'Fecha límite de postulación',
            importance: 'high' as const
          }
        ],
        requirements_summary: convocatoria.requisitos ? [convocatoria.requisitos] : ['Revisar bases de la convocatoria'],
        estimated_competition: 'medium' as const,
        target_audience: ['Emprendedores', 'PyMES', 'Startups'],
        success_tips: ['Preparar documentación completa', 'Revisar criterios de evaluación'],
        similar_opportunities: ['Buscar en CORFO', 'Revisar SERCOTEC'],
        risk_assessment: {
          level: 'medium' as const,
          factors: ['Competencia esperada', 'Requisitos técnicos']
        }
      }
    }

    // Validar y limpiar datos del preview
    if (!enhancedPreview.enhanced_description) {
      enhancedPreview.enhanced_description = `${convocatoria.nombre_concurso} - ${convocatoria.institucion}`
    }
    
    if (!Array.isArray(enhancedPreview.key_points)) {
      enhancedPreview.key_points = []
    }
    
    if (!Array.isArray(enhancedPreview.timeline)) {
      enhancedPreview.timeline = []
    }

    // Asegurar que el timeline incluya la fecha de cierre
    const hasDeadline = enhancedPreview.timeline.some(t => t.date === convocatoria.fecha_cierre)
    if (!hasDeadline) {
      enhancedPreview.timeline.unshift({
        date: convocatoria.fecha_cierre,
        event: 'Fecha límite de postulación',
        importance: 'high'
      })
    }

    // Agregar fechas adicionales si están disponibles
    if (convocatoria.fecha_apertura) {
      const hasOpening = enhancedPreview.timeline.some(t => t.date === convocatoria.fecha_apertura)
      if (!hasOpening) {
        enhancedPreview.timeline.unshift({
          date: convocatoria.fecha_apertura,
          event: 'Apertura de convocatoria',
          importance: 'medium'
        })
      }
    }

    if (convocatoria.fecha_resultados) {
      const hasResults = enhancedPreview.timeline.some(t => t.date === convocatoria.fecha_resultados)
      if (!hasResults) {
        enhancedPreview.timeline.push({
          date: convocatoria.fecha_resultados,
          event: 'Publicación de resultados',
          importance: 'high'
        })
      }
    }

    // Ordenar timeline por fecha
    enhancedPreview.timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return new Response(
      JSON.stringify(enhancedPreview),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en enhance-preview:', error)
    
    return new Response(
      JSON.stringify({
        enhanced_description: 'Error al generar vista previa mejorada',
        key_points: [],
        timeline: [],
        requirements_summary: [],
        estimated_competition: 'medium',
        target_audience: [],
        success_tips: [],
        similar_opportunities: [],
        risk_assessment: {
          level: 'medium',
          factors: ['No se pudo evaluar']
        }
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})