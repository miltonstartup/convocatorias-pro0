// Edge Function para calcular estadísticas del dashboard en backend
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
}

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
    convocatorias_limit: number | string
    usage_percentage: number
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Obtener el token de autorización
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Crear cliente de Supabase con el token del usuario
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      throw new Error('Usuario no autenticado')
    }

    // Obtener convocatorias del usuario
    const { data: convocatorias, error: convocatoriasError } = await supabase
      .from('convocatorias')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (convocatoriasError) {
      throw convocatoriasError
    }

    // Obtener perfil del usuario para plan
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.warn('Error getting profile:', profileError)
    }

    const userPlan = profile?.plan || 'free'
    const isPro = userPlan === 'pro_monthly' || userPlan === 'pro_annual'
    
    // Calcular estadísticas
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const safeConvocatorias = convocatorias || []
    
    // Estadísticas básicas
    const totalConvocatorias = safeConvocatorias.length
    const activeConvocatorias = safeConvocatorias.filter(c => c.estado === 'abierto').length
    
    // Vencimientos próximos
    const deadlineThisWeek = safeConvocatorias.filter(c => {
      if (!c.fecha_cierre) return false
      const deadline = new Date(c.fecha_cierre)
      return deadline >= now && deadline <= weekFromNow
    }).length
    
    const deadlineThisMonth = safeConvocatorias.filter(c => {
      if (!c.fecha_cierre) return false
      const deadline = new Date(c.fecha_cierre)
      return deadline >= now && deadline <= monthFromNow
    }).length

    // Estadísticas por estado
    const byStatus: Record<string, number> = {}
    safeConvocatorias.forEach(c => {
      const estado = c.estado || 'sin_estado'
      byStatus[estado] = (byStatus[estado] || 0) + 1
    })

    // Top organizaciones
    const orgCounts: Record<string, number> = {}
    safeConvocatorias.forEach(c => {
      if (c.institucion) {
        orgCounts[c.institucion] = (orgCounts[c.institucion] || 0) + 1
      }
    })
    
    const byOrganization = Object.entries(orgCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Próximos vencimientos
    const upcomingDeadlines = safeConvocatorias
      .filter(c => c.fecha_cierre && new Date(c.fecha_cierre) >= now)
      .slice(0, 5)
      .map(c => {
        const daysUntil = Math.ceil((new Date(c.fecha_cierre).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: c.id.toString(),
          title: c.nombre_concurso || 'Sin nombre',
          organization: c.institucion || 'Sin institución',
          deadline: c.fecha_cierre,
          days_until: daysUntil,
          priority: daysUntil <= 7 ? 'alta' : daysUntil <= 30 ? 'media' : 'baja'
        }
      })
      .sort((a, b) => a.days_until - b.days_until)

    // Actividad reciente
    const recentActivity = safeConvocatorias
      .slice(0, 5)
      .map(c => ({
        id: c.id.toString(),
        title: c.nombre_concurso || 'Sin nombre',
        action: 'Convocatoria añadida',
        date: c.created_at || new Date().toISOString()
      }))

    // Estadísticas por mes (últimos 6 meses)
    const byMonth: Array<{ month: string; count: number }> = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const month = date.toISOString().substring(0, 7) // YYYY-MM
      const count = safeConvocatorias.filter(c => 
        c.created_at && c.created_at.startsWith(month)
      ).length
      byMonth.push({ month, count })
    }

    // Uso del plan
    const planUsage = {
      current_plan: userPlan,
      convocatorias_used: totalConvocatorias,
      convocatorias_limit: isPro ? 'Ilimitadas' : 5,
      usage_percentage: isPro ? 0 : Math.min((totalConvocatorias / 5) * 100, 100)
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

    return new Response(JSON.stringify({ data: stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error en dashboard-stats:', error)
    
    const errorResponse = {
      error: {
        code: 'DASHBOARD_STATS_ERROR',
        message: error.message || 'Error desconocido al calcular estadísticas'
      }
    }

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})