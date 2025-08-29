// Hook para funcionalidades avanzadas de la Fase 2
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useConvocatorias } from './useConvocatorias'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// Tipos
export interface DashboardStats {
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

export interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'cierre' | 'apertura' | 'resultados'
  priority: 'alta' | 'media' | 'baja'
  organization: string
  daysUntil: number
  convocatoriaId: string
}

export interface CalendarResponse {
  events: CalendarEvent[]
  summary: {
    total: number
    urgent: number
    upcoming_week: number
  }
}

// Hook principal para funcionalidades avanzadas
export function useAdvancedFeatures() {
  const { user } = useAuth()
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Obtener estadísticas desde el backend
  const fetchDashboardStats = async () => {
    if (!user) {
      setIsLoadingStats(false)
      return
    }

    try {
      setIsLoadingStats(true)
      setStatsError(null)

      const { data, error } = await supabase.functions.invoke('dashboard-stats-v2', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al obtener estadísticas')
      }

      if (data?.error) {
        throw new Error(data.error.message || 'Error en el servidor')
      }

      setDashboardStats(data.data)
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error)
      setStatsError(error.message)
      toast.error('Error al cargar estadísticas', {
        description: error.message
      })
    } finally {
      setIsLoadingStats(false)
    }
  }

  // Cargar estadísticas cuando el usuario cambie
  useEffect(() => {
    fetchDashboardStats()
  }, [user])

  // Exportar datos (simplificado)
  const exportDataMutation = useMutation({
    mutationFn: async ({ format }: { format: 'csv' | 'pdf' }) => {
      if (!convocatorias || convocatorias.length === 0) {
        throw new Error('No hay datos para exportar')
      }
      
      if (format === 'csv') {
        const headers = ['ID', 'Nombre', 'Institución', 'Estado', 'Fecha Cierre']
        const rows = convocatorias.map(c => [
          c.id,
          c.nombre_concurso,
          c.institucion || '',
          c.estado,
          c.fecha_cierre
        ])
        
        return [headers, ...rows].map(row => row.join(',')).join('\n')
      }
      
      return 'Exportación PDF no implementada aún'
    },
    onSuccess: (data, variables) => {
      if (variables.format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `convocatorias_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast.success('Archivo CSV descargado correctamente')
      }
    },
    onError: (error: Error) => {
      toast.error('Error al exportar datos', {
        description: error.message
      })
    }
  })

  return {
    dashboardStats,
    isLoadingStats,
    statsError,
    exportData: exportDataMutation.mutate,
    isExporting: exportDataMutation.isPending,
    refreshStats: fetchDashboardStats
  }
}

// Hook para límites de plan
export function usePlanLimits() {
  const { isPro } = useAuth()
  const { convocatorias } = useConvocatorias()
  
  const isPlanFree = !isPro
  const isPlanPro = isPro
  
  const checkFeatureAccess = (feature: string) => {
    if (isPlanPro) {
      return { allowed: true, reason: null }
    }
    
    const freeFeatures = ['basic_dashboard', 'manual_entry', 'basic_calendar']
    const proFeatures = ['export_csv', 'export_pdf', 'advanced_analytics', 'ai_features']
    
    if (freeFeatures.includes(feature)) {
      return { allowed: true, reason: null }
    }
    
    if (proFeatures.includes(feature)) {
      return { 
        allowed: false, 
        reason: 'Esta funcionalidad requiere Plan Pro'
      }
    }
    
    return { allowed: true, reason: null }
  }
  
  const getConvocatoriasUsage = () => {
    const used = convocatorias?.length || 0
    const limit = isPlanFree ? 5 : Infinity
    const percentage = limit === Infinity ? 0 : (used / limit) * 100
    
    return {
      used,
      limit: limit === Infinity ? 'Ilimitadas' : limit,
      percentage,
      isNearLimit: percentage >= 80,
      isAtLimit: used >= limit
    }
  }
  
  const planUsage = getConvocatoriasUsage()
  
  return {
    isPlanFree,
    isPlanPro,
    checkFeatureAccess,
    planUsage,
    isNearLimit: planUsage.isNearLimit,
    isAtLimit: planUsage.isAtLimit
  }
}

// Hook específico para eventos del calendario
export function useCalendarEvents() {
  const { convocatorias } = useConvocatorias()
  
  const getCalendarEvents = ({ month, view }: { month: string, view: 'month' | 'upcoming' }) => {
    if (!convocatorias) return { events: [], summary: { total: 0, urgent: 0, upcoming_week: 0 } }
    
    const now = new Date()
    const events: CalendarEvent[] = []
    
    convocatorias.forEach(conv => {
      // Evento de cierre
      if (conv.fecha_cierre) {
        const closeDate = new Date(conv.fecha_cierre)
        const daysUntil = Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        events.push({
          id: `${conv.id}-close`,
          title: `Cierre: ${conv.nombre_concurso}`,
          date: conv.fecha_cierre,
          type: 'cierre',
          priority: daysUntil <= 7 ? 'alta' : daysUntil <= 30 ? 'media' : 'baja',
          organization: conv.institucion || '',
          daysUntil,
          convocatoriaId: conv.id.toString()
        })
      }
      
      // Evento de resultados
      if (conv.fecha_resultados) {
        const resultsDate = new Date(conv.fecha_resultados)
        const daysUntil = Math.ceil((resultsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        events.push({
          id: `${conv.id}-results`,
          title: `Resultados: ${conv.nombre_concurso}`,
          date: conv.fecha_resultados,
          type: 'resultados',
          priority: daysUntil <= 7 ? 'alta' : daysUntil <= 30 ? 'media' : 'baja',
          organization: conv.institucion || '',
          daysUntil,
          convocatoriaId: conv.id.toString()
        })
      }
    })
    
    // Filtrar eventos según el mes si está en vista mensual
    const filteredEvents = view === 'month' 
      ? events.filter(event => event.date.startsWith(month))
      : events.filter(event => new Date(event.date) >= now)
    
    const urgent = filteredEvents.filter(e => e.priority === 'alta').length
    const upcoming_week = filteredEvents.filter(e => e.daysUntil <= 7 && e.daysUntil >= 0).length
    
    return {
      events: filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      summary: {
        total: filteredEvents.length,
        urgent,
        upcoming_week
      }
    }
  }
  
  return { getCalendarEvents }
}
