// Edge Function: get-recommendations
// Genera recomendaciones personalizadas usando el recommender-agent

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ConvocatoriaData {
  id: number
  nombre_concurso: string
  institucion: string
  fecha_cierre: string
  monto_financiamiento?: string
  descripcion?: string
  estado: string
}

interface Recommendation {
  convocatoria: ConvocatoriaData
  score: number
  reason: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (!['POST', 'GET'].includes(req.method)) {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticación requerido' }),
        { status: 401, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Verificar plan del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.plan === 'free') {
      return new Response(
        JSON.stringify({ error: 'Esta funcionalidad requiere plan Pro' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Obtener todas las convocatorias del usuario
    const { data: convocatorias } = await supabase
      .from('convocatorias')
      .select('id, nombre_concurso, institucion, fecha_cierre, monto_financiamiento, descripcion, estado')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!convocatorias || convocatorias.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: 'Añade algunas convocatorias para obtener recomendaciones personalizadas'
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Extraer intereses del usuario basados en su historial
    const userInterests = [...new Set(
      convocatorias
        .map(c => c.institucion)
        .filter(Boolean)
        .slice(0, 10)
    )]

    // Crear perfil del usuario
    const userProfile = {
      name: profile.full_name || 'Usuario',
      plan: profile.plan,
      totalConvocatorias: convocatorias.length,
      instituciones: userInterests
    }

    // Obtener convocatorias abiertas o próximas
    const availableConvocatorias = convocatorias.filter(c => 
      c.estado === 'abierto' || 
      (c.fecha_cierre && new Date(c.fecha_cierre) > new Date())
    ).slice(0, 10) // Limitar para el prompt

    if (availableConvocatorias.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: 'No hay convocatorias abiertas disponibles para recomendar'
        }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Preparar prompt para IA
    const prompt = `
Eres un experto en matching de convocatorias de financiamiento. Analiza las convocatorias disponibles y recomienda las 3 mejores para este usuario.

Perfil del usuario:
${JSON.stringify(userProfile, null, 2)}

Intereses del usuario: ${userInterests.join(', ')}

Convocatorias disponibles:
${JSON.stringify(availableConvocatorias, null, 2)}

Para cada convocatoria, evalúa:
1. Compatibilidad con el perfil del usuario (0-100)
2. Relevancia según intereses (0-100) 
3. Factibilidad de aplicación (0-100)

Recomienda las 3 mejores convocatorias y explica por qué son buenas opciones.

Responde en formato JSON:
{
  "recommendations": [
    {
      "convocatoriaIndex": 0,
      "score": 85,
      "reason": "Esta convocatoria es ideal porque..."
    },
    {
      "convocatoriaIndex": 1,
      "score": 78,
      "reason": "Recomendada por..."
    },
    {
      "convocatoriaIndex": 2,
      "score": 72,
      "reason": "Buena opción debido a..."
    }
  ]
}`

    // Llamar a OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL'),
        'X-Title': 'Convocatorias Pro - Recommender Agent'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1000
      })
    })

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.status}`)
    }

    const aiResponse = await openRouterResponse.json()
    const aiContent = aiResponse.choices[0]?.message?.content || ''
    
    let recommendations: Recommendation[] = []
    try {
      const parsed = JSON.parse(aiContent)
      recommendations = parsed.recommendations?.map((rec: any) => ({
        convocatoria: availableConvocatorias[rec.convocatoriaIndex],
        score: rec.score,
        reason: rec.reason
      })).filter((rec: Recommendation) => rec.convocatoria) || []
    } catch (parseError) {
      console.warn('Error al parsear recomendaciones:', parseError)
      
      // Recomendaciones básicas por defecto
      recommendations = availableConvocatorias.slice(0, 3).map((conv, index) => ({
        convocatoria: conv,
        score: 70 - (index * 5),
        reason: `Convocatoria relevante según tu historial en ${conv.institucion}`
      }))
    }

    return new Response(
      JSON.stringify({ 
        recommendations,
        userProfile,
        totalAvailable: availableConvocatorias.length,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en get-recommendations:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})