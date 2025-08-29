import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface SavedConvocatoria {
  id: string
  user_id: string
  ai_search_result_id?: string
  title: string
  description?: string
  organization?: string
  deadline?: string
  amount?: string
  requirements?: string
  source_url?: string
  tags?: string[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface SaveConvocatoriaData {
  ai_search_result_id?: string
  title: string
  description?: string
  organization?: string
  deadline?: string
  amount?: string
  requirements?: string
  source_url?: string
  tags?: string[]
  notes?: string
}

export function useSavedConvocatorias() {
  const { user } = useAuth()
  const [savedConvocatorias, setSavedConvocatorias] = useState<SavedConvocatoria[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar convocatorias guardadas al montar el componente
  useEffect(() => {
    if (user) {
      loadSavedConvocatorias()
    }
  }, [user])

  const loadSavedConvocatorias = async () => {
    if (!user) {
      setError('Debe estar autenticado')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('📂 Cargando convocatorias guardadas...')
      
      const { data, error: functionError } = await supabase.functions.invoke('manage-saved-convocatorias-fixed', {
        method: 'GET'
      })

      if (functionError) {
        console.error('❌ Error en función:', functionError)
        throw new Error(functionError.message || 'Error al cargar convocatorias guardadas')
      }

      if (data?.error) {
        console.error('❌ Error en data:', data.error)
        throw new Error(data.error.message || 'Error al cargar convocatorias guardadas')
      }

      console.log('✅ Convocatorias guardadas cargadas:', data.data.saved_convocatorias)
      setSavedConvocatorias(data.data.saved_convocatorias || [])

    } catch (err) {
      console.error('❌ Error cargando convocatorias guardadas:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar convocatorias guardadas')
    } finally {
      setIsLoading(false)
    }
  }

  const saveConvocatoria = async (convocatoriaData: SaveConvocatoriaData) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    if (!convocatoriaData.title.trim()) {
      setError('El título es requerido')
      return false
    }

    setError(null)

    try {
      console.log('💾 Guardando convocatoria:', convocatoriaData)
      
      const { data, error: functionError } = await supabase.functions.invoke('manage-saved-convocatorias-fixed', {
        method: 'POST',
        body: convocatoriaData
      })

      if (functionError) {
        console.error('❌ Error en función:', functionError)
        throw new Error(functionError.message || 'Error al guardar convocatoria')
      }

      if (data?.error) {
        console.error('❌ Error en data:', data.error)
        throw new Error(data.error.message || 'Error al guardar convocatoria')
      }

      console.log('✅ Convocatoria guardada:', data.data.saved_convocatoria)
      
      // Actualizar lista local
      setSavedConvocatorias(prev => [data.data.saved_convocatoria, ...prev])

      return true
    } catch (err) {
      console.error('❌ Error guardando convocatoria:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar convocatoria')
      return false
    }
  }

  const updateConvocatoria = async (id: string, convocatoriaData: Partial<SaveConvocatoriaData>) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    setError(null)

    try {
      console.log('📝 Actualizando convocatoria:', { id, convocatoriaData })
      
      const { data, error: functionError } = await supabase.functions.invoke('manage-saved-convocatorias-fixed', {
        method: 'PUT',
        body: { id, ...convocatoriaData }
      })

      if (functionError) {
        console.error('❌ Error en función:', functionError)
        throw new Error(functionError.message || 'Error al actualizar convocatoria')
      }

      if (data?.error) {
        console.error('❌ Error en data:', data.error)
        throw new Error(data.error.message || 'Error al actualizar convocatoria')
      }

      console.log('✅ Convocatoria actualizada:', data.data.updated_convocatoria)
      
      // Actualizar lista local
      setSavedConvocatorias(prev => 
        prev.map(conv => 
          conv.id === id ? { ...conv, ...data.data.updated_convocatoria } : conv
        )
      )

      return true
    } catch (err) {
      console.error('❌ Error actualizando convocatoria:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar convocatoria')
      return false
    }
  }

  const deleteConvocatoria = async (id: string) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    setError(null)

    try {
      console.log('🗑️ Eliminando convocatoria:', id)
      
      const { data, error: functionError } = await supabase.functions.invoke('manage-saved-convocatorias-fixed', {
        method: 'DELETE',
        body: { id }
      })

      if (functionError) {
        console.error('❌ Error en función:', functionError)
        throw new Error(functionError.message || 'Error al eliminar convocatoria')
      }

      if (data?.error) {
        console.error('❌ Error en data:', data.error)
        throw new Error(data.error.message || 'Error al eliminar convocatoria')
      }

      console.log('✅ Convocatoria eliminada')
      
      // Actualizar lista local
      setSavedConvocatorias(prev => prev.filter(conv => conv.id !== id))

      return true
    } catch (err) {
      console.error('❌ Error eliminando convocatoria:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar convocatoria')
      return false
    }
  }

  const searchSavedConvocatorias = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      return savedConvocatorias
    }

    const term = searchTerm.toLowerCase()
    return savedConvocatorias.filter(conv => 
      conv.title.toLowerCase().includes(term) ||
      conv.description?.toLowerCase().includes(term) ||
      conv.organization?.toLowerCase().includes(term) ||
      conv.tags?.some(tag => tag.toLowerCase().includes(term))
    )
  }

  const filterByDeadline = (days: number) => {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)

    return savedConvocatorias.filter(conv => {
      if (!conv.deadline) return false
      const deadline = new Date(conv.deadline)
      return deadline <= targetDate
    })
  }

  return {
    savedConvocatorias,
    isLoading,
    error,
    loadSavedConvocatorias,
    saveConvocatoria,
    updateConvocatoria,
    deleteConvocatoria,
    searchSavedConvocatorias,
    filterByDeadline,
    clearError: () => setError(null)
  }
}