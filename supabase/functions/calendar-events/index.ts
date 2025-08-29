// Edge Function: calendar-events
// Obtiene eventos del calendario inteligente y gestiona alertas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'cierre' | 'apertura' | 'resultados'
  priority: 'alta' | 'media' | 'baja'
  organization: string
  daysUntil: number
  convocatoriaId: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Token de autorización requerido')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Token inválido')
    }

    if (req.method === 'GET') {
      // Obtener eventos del calendario
      const url = new URL(req.url)
      const month = url.searchParams.get('month') // formato: YYYY-MM
      const view = url.searchParams.get('view') || 'month' // month, week, upcoming

      // Calcular rango de fechas
      let startDate: Date
      let endDate: Date
      
      if (view === 'upcoming') {
        startDate = new Date()
        endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 3) // Próximos 3 meses
      } else if (month) {
        const [year, monthNum] = month.split('-').map(Number)
        startDate = new Date(year, monthNum - 1, 1)
        endDate = new Date(year, monthNum, 0) // Último día del mes
      } else {
        startDate = new Date()
        startDate.setDate(1) // Primer día del mes actual
        endDate = new Date()
        endDate.setMonth(endDate.getMonth() + 1, 0) // Último día del mes actual
      }

      // Obtener convocatorias del usuario
      const { data: convocatorias, error: fetchError } = await supabase
        .from('convocatorias')
        .select('*')
        .eq('user_id', user.id)
        .or(`fecha_cierre.gte.${startDate.toISOString()},fecha_apertura.gte.${startDate.toISOString()},fecha_resultados.gte.${startDate.toISOString()}`)
        .order('fecha_cierre', { ascending: true })

      if (fetchError) {
        throw new Error(`Error al obtener convocatorias: ${fetchError.message}`)
      }

      // Convertir a eventos de calendario
      const events: CalendarEvent[] = []
      const now = new Date()

      convocatorias?.forEach(conv => {
        // Evento de apertura
        if (conv.fecha_apertura) {
          const apertura = new Date(conv.fecha_apertura)
          if (apertura >= startDate && apertura <= endDate) {
            events.push({
              id: `${conv.id}_apertura`,
              title: `📅 Apertura: ${conv.nombre_concurso}`,
              date: apertura.toISOString(),
              type: 'apertura',
              priority: 'media',
              organization: conv.institucion || '',
              daysUntil: Math.ceil((apertura.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
              convocatoriaId: conv.id.toString()
            })
          }
        }

        // Evento de cierre (más importante)
        if (conv.fecha_cierre) {
          const cierre = new Date(conv.fecha_cierre)
          if (cierre >= startDate && cierre <= endDate) {
            const daysUntil = Math.ceil((cierre.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            
            events.push({
              id: `${conv.id}_cierre`,
              title: `⏰ Cierre: ${conv.nombre_concurso}`,
              date: cierre.toISOString(),
              type: 'cierre',
              priority: daysUntil <= 7 ? 'alta' : daysUntil <= 30 ? 'media' : 'baja',
              organization: conv.institucion || '',
              daysUntil,
              convocatoriaId: conv.id.toString()
            })
          }
        }

        // Evento de resultados
        if (conv.fecha_resultados) {
          const resultados = new Date(conv.fecha_resultados)
          if (resultados >= startDate && resultados <= endDate) {
            events.push({
              id: `${conv.id}_resultados`,
              title: `🏆 Resultados: ${conv.nombre_concurso}`,
              date: resultados.toISOString(),
              type: 'resultados',
              priority: 'media',
              organization: conv.institucion || '',
              daysUntil: Math.ceil((resultados.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
              convocatoriaId: conv.id.toString()
            })
          }
        }
      })

      // Ordenar eventos por fecha
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return new Response(
        JSON.stringify({
          events,
          summary: {
            total: events.length,
            urgent: events.filter(e => e.priority === 'alta').length,
            upcoming_week: events.filter(e => e.daysUntil <= 7 && e.daysUntil >= 0).length
          }
        }),
        { headers: corsHeaders }
      )

    } else if (req.method === 'POST') {
      // Configurar alerta personalizada
      const { convocatoriaId, alertType, daysBeforeDeadline } = await req.json()
      
      // Verificar que la convocatoria pertenece al usuario
      const { data: convocatoria } = await supabase
        .from('convocatorias')
        .select('id, nombre_concurso, fecha_cierre')
        .eq('id', convocatoriaId)
        .eq('user_id', user.id)
        .single()

      if (!convocatoria) {
        throw new Error('Convocatoria no encontrada')
      }

      // Calcular fecha de alerta
      const deadline = new Date(convocatoria.fecha_cierre)
      const alertDate = new Date(deadline)
      alertDate.setDate(alertDate.getDate() - (daysBeforeDeadline || 7))

      // En una implementación real, aquí guardarías la configuración de alerta
      // y usarías un sistema de cron jobs para enviar las notificaciones
      
      return new Response(
        JSON.stringify({
          message: 'Alerta configurada correctamente',
          alert: {
            convocatoria: convocatoria.nombre_concurso,
            alertDate: alertDate.toISOString(),
            type: alertType
          }
        }),
        { headers: corsHeaders }
      )
    }

  } catch (error) {
    console.error('Error en calendar-events:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Error en calendario',
        details: error.message
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
