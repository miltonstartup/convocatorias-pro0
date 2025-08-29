import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Convocatoria, ConvocatoriaForm, DashboardFilters, DashboardStats } from '@/types'
import { useAuth } from './useAuth'

export function useConvocatorias() {
  const { user } = useAuth()
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConvocatorias = async (filters: DashboardFilters = {}) => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('convocatorias')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters.estado && filters.estado !== 'todos') {
        query = query.eq('estado', filters.estado)
      }

      if (filters.institucion) {
        query = query.ilike('institucion', `%${filters.institucion}%`)
      }

      if (filters.tipo_fondo) {
        query = query.ilike('tipo_fondo', `%${filters.tipo_fondo}%`)
      }

      if (filters.search) {
        query = query.or(`nombre_concurso.ilike.%${filters.search}%,institucion.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      setConvocatorias(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching convocatorias:', err)
    } finally {
      setLoading(false)
    }
  }

  const createConvocatoria = async (convocatoriaData: ConvocatoriaForm) => {
    if (!user) throw new Error('Usuario no autenticado')

    // Procesar fechas - convertir strings de fecha a timestamps
    const processedData = {
      ...convocatoriaData,
      user_id: user.id,
      // Convertir fechas de formato YYYY-MM-DD a timestamps con hora
      fecha_apertura: convocatoriaData.fecha_apertura ? 
        `${convocatoriaData.fecha_apertura} 09:00:00` : null,
      fecha_cierre: convocatoriaData.fecha_cierre ? 
        `${convocatoriaData.fecha_cierre} 23:59:59` : null,
      fecha_resultados: convocatoriaData.fecha_resultados ? 
        `${convocatoriaData.fecha_resultados} 18:00:00` : null
    }

    const { data, error } = await supabase
      .from('convocatorias')
      .insert(processedData)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Actualizar lista local
    setConvocatorias(prev => [data, ...prev])
    return data
  }

  const updateConvocatoria = async (id: number, updates: Partial<ConvocatoriaForm>) => {
    if (!user) throw new Error('Usuario no autenticado')

    // Procesar fechas en las actualizaciones también
    const processedUpdates = {
      ...updates,
      // Convertir fechas si están presentes
      ...(updates.fecha_apertura && {
        fecha_apertura: `${updates.fecha_apertura} 09:00:00`
      }),
      ...(updates.fecha_cierre && {
        fecha_cierre: `${updates.fecha_cierre} 23:59:59`
      }),
      ...(updates.fecha_resultados && {
        fecha_resultados: `${updates.fecha_resultados} 18:00:00`
      })
    }

    const { data, error } = await supabase
      .from('convocatorias')
      .update(processedUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    // Actualizar lista local
    setConvocatorias(prev => 
      prev.map(conv => conv.id === id ? data : conv)
    )
    return data
  }

  const deleteConvocatoria = async (id: number) => {
    if (!user) throw new Error('Usuario no autenticado')

    const { error } = await supabase
      .from('convocatorias')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    // Actualizar lista local
    setConvocatorias(prev => prev.filter(conv => conv.id !== id))
  }

  const getStats = (): DashboardStats => {
    const now = new Date()
    const stats: DashboardStats = {
      total: convocatorias.length,
      abiertas: 0,
      cerradas: 0,
      en_evaluacion: 0,
      proximas_a_cerrar: 0
    }

    convocatorias.forEach(conv => {
      switch (conv.estado) {
        case 'abierto':
          stats.abiertas++
          // Verificar si está próxima a cerrar (7 días)
          const fechaCierre = new Date(conv.fecha_cierre)
          const diffTime = fechaCierre.getTime() - now.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays <= 7 && diffDays >= 0) {
            stats.proximas_a_cerrar++
          }
          break
        case 'cerrado':
          stats.cerradas++
          break
        case 'en_evaluacion':
          stats.en_evaluacion++
          break
      }
    })

    return stats
  }

  const getConvocatoriaById = (id: number): Convocatoria | undefined => {
    return convocatorias.find(conv => conv.id === id)
  }

  useEffect(() => {
    if (user) {
      fetchConvocatorias()
    }
  }, [user])

  return {
    convocatorias,
    loading,
    isLoading: loading,
    error,
    fetchConvocatorias,
    createConvocatoria,
    updateConvocatoria,
    deleteConvocatoria,
    getStats,
    getConvocatoriaById,
    refresh: () => fetchConvocatorias()
  }
}

export function useConvocatoria(id: number) {
  const { getConvocatoriaById } = useConvocatorias()
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const found = getConvocatoriaById(id)
    setConvocatoria(found || null)
    setLoading(false)
  }, [id, getConvocatoriaById])

  return { convocatoria, loading }
}