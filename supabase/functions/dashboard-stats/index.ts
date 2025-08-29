// Edge Function: dashboard-stats
// Proporciona estadísticas y métricas para el dashboard principal

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DashboardStats {
  overview: {
    total_convocatorias: number
    active_convocatorias: number
    deadline_this_week: number
    deadline_this_month: number
  }
  by_status: Record<string, number>
  by_organization: Array<{ name: string; count: number }>
  by_month: Array<{ month: string; count: number }>
  recent_activity: Array<{
    id: string
    title: string
    action: string
    date: string
  }>
  upcoming_deadlines: Array<{
    id: string
    title: string
    organization: string
    deadline: string
    days_until: number
    priority: string
  }>
  plan_usage: {
    current_plan: string
    convocatorias_used: number
    convocatorias_limit: number
    usage_percentage: number
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: corsHeaders }
    )
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

    // Obtener perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    // Obtener plan details
    const { data: planDetails } = await supabase
      .from('plans')
      .select('max_convocatorias')
      .eq('id', profile?.plan || 'free')
      .single()

    // Obtener todas las convocatorias del usuario
    const { data: convocatorias, error: fetchError } = await supabase
      .from('convocatorias')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Error al obtener convocatorias: ${fetchError.message}`)
    }

    const now = new Date()
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Calcular estadísticas generales
    const totalConvocatorias = convocatorias?.length || 0
    const activeConvocatorias = convocatorias?.filter(c => 
      c.estado === 'abierta' || c.estado === 'proximamente'
    ).length || 0
    
    const deadlineThisWeek = convocatorias?.filter(c => {
      if (!c.fecha_cierre) return false
      const deadline = new Date(c.fecha_cierre)
      return deadline >= now && deadline <= oneWeek
    }).length || 0

    const deadlineThisMonth = convocatorias?.filter(c => {
      if (!c.fecha_cierre) return false
      const deadline = new Date(c.fecha_cierre)
      return deadline >= now && deadline <= oneMonth
    }).length || 0

    // Estadísticas por estado
    const byStatus: Record<string, number> = {}
    convocatorias?.forEach(c => {
      const status = c.estado || 'sin_estado'
      byStatus[status] = (byStatus[status] || 0) + 1
    })

    // Top organizaciones
    const orgCounts: Record<string, number> = {}
    convocatorias?.forEach(c => {
      const org = c.institucion || 'Sin institución'
      orgCounts[org] = (orgCounts[org] || 0) + 1
    })
    
    const byOrganization = Object.entries(orgCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Tendencia por mes (últimos 6 meses)
    const monthCounts: Record<string, number> = {}
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    convocatorias?.forEach(c => {
      const created = new Date(c.created_at)
      if (created >= sixMonthsAgo) {
        const monthKey = created.toISOString().slice(0, 7) // YYYY-MM
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1
      }
    })

    const byMonth = Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Actividad reciente (últimas 10 convocatorias creadas/modificadas)
    const recentActivity = convocatorias?.slice(0, 10).map(c => ({
      id: c.id.toString(),
      title: c.nombre_concurso || 'Sin título',
      action: 'Creada',
      date: c.created_at
    })) || []

    // Próximos vencimientos
    const upcomingDeadlines = convocatorias
      ?.filter(c => {
        if (!c.fecha_cierre) return false
        const deadline = new Date(c.fecha_cierre)
        return deadline >= now
      })
      .sort((a, b) => new Date(a.fecha_cierre).getTime() - new Date(b.fecha_cierre).getTime())
      .slice(0, 5)
      .map(c => {
        const deadline = new Date(c.fecha_cierre)
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          id: c.id.toString(),
          title: c.nombre_concurso || 'Sin título',
          organization: c.institucion || 'Sin institución',
          deadline: c.fecha_cierre,
          days_until: daysUntil,
          priority: daysUntil <= 7 ? 'alta' : daysUntil <= 30 ? 'media' : 'baja'
        }
      }) || []

    // Uso del plan
    const maxConvocatorias = planDetails?.max_convocatorias || 5
    const planUsage = {
      current_plan: profile?.plan || 'free',
      convocatorias_used: totalConvocatorias,
      convocatorias_limit: maxConvocatorias === -1 ? 'ilimitado' : maxConvocatorias,
      usage_percentage: maxConvocatorias === -1 ? 0 : Math.round((totalConvocatorias / maxConvocatorias) * 100)
    }

    const stats: DashboardStats = {
      overview: {
        total_convocatorias: totalConvocatorias,
        active_convocatorias: activeConvocatorias,
        deadline_this_week: deadlineThisWeek,
        deadline_this_month: deadlineThisMonth
      },
      by_status: byStatus,
      by_organization: byOrganization,
      by_month: byMonth,
      recent_activity: recentActivity,
      upcoming_deadlines: upcomingDeadlines,
      plan_usage: planUsage
    }

    return new Response(
      JSON.stringify({ data: stats }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en dashboard-stats:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Error al obtener estadísticas',
        details: error.message
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
