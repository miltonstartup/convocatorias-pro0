// Edge Function: track-suggestions
// Busca nuevas convocatorias usando el tracker-agent

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Obtener convocatorias recientes del usuario
    const { data: recentConvocatorias } = await supabase
      .from('convocatorias')
      .select('nombre_concurso, institucion, monto_financiamiento, descripcion')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Crear perfil del usuario
    const userProfile = {
      name: profile.full_name || 'Usuario',
      plan: profile.plan,
      interests: recentConvocatorias?.map(c => c.institucion).filter(Boolean) || []
    }

    // Preparar prompt para IA
    const prompt = `
Eres un experto en convocatorias de financiamiento en Chile. Basándote en el perfil del usuario y su historial, sugiere 5 convocatorias que podrían estar disponibles actualmente.

Perfil del usuario:
${JSON.stringify(userProfile, null, 2)}

Convocatorias recientes del usuario:
${JSON.stringify(recentConvocatorias?.slice(0, 5) || [], null, 2)}

Sugiere 5 convocatorias reales de instituciones chilenas (CORFO, SERCOTEC, Fondos de Cultura, etc.) que podrían estar abiertas en enero 2025. Include:
- Nombre específico
- Institución
- Tipo de proyecto que financia
- Aproximadamente cuándo suele abrirse

Responde en formato JSON:
{
  "suggestions": [
    "Nombre de convocatoria 1 - Institución - Descripción breve",
    "Nombre de convocatoria 2 - Institución - Descripción breve",
    "Nombre de convocatoria 3 - Institución - Descripción breve",
    "Nombre de convocatoria 4 - Institución - Descripción breve",
    "Nombre de convocatoria 5 - Institución - Descripción breve"
  ]
}`

    // Llamar a OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL'),
        'X-Title': 'Convocatorias Pro - Tracker Agent'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 800
      })
    })

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter API error: ${openRouterResponse.status}`)
    }

    const aiResponse = await openRouterResponse.json()
    const aiContent = aiResponse.choices[0]?.message?.content || ''
    
    let suggestions: string[] = []
    try {
      const parsed = JSON.parse(aiContent)
      suggestions = parsed.suggestions || []
    } catch (parseError) {
      console.warn('Error al parsear sugerencias:', parseError)
      // Sugerencias por defecto
      suggestions = [
        'Fondo Nacional de Desarrollo Científico y Tecnológico (FONDECYT) - ANID - Financiamiento para investigación científica',
        'Capital Semilla de CORFO - CORFO - Apoyo a emprendimientos innovadores',
        'Fondo de Fomento al Arte en la Educación - MinEduc - Proyectos artísticos educativos',
        'Programa de Apoyo al Entorno para el Emprendimiento - SERCOTEC - Fortalecimiento de ecosistemas emprendedores',
        'Fondo de Innovación para la Competitividad - FIC - Proyectos de innovación regional'
      ]
    }

    return new Response(
      JSON.stringify({ 
        suggestions,
        userProfile,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en track-suggestions:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})