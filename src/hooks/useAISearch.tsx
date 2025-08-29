import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export interface SearchParameters {
  sector?: string
  location?: string
  min_amount?: string
  max_amount?: string
  deadline_from?: string
  deadline_to?: string
  type?: string
}

export interface SearchResult {
  id: string
  search_id: string
  title: string
  description: string
  deadline: string
  amount: string
  requirements: string
  source_url: string
  validated_data: {
    organization: string
    category: string
    status: string
    reliability_score: number
    validation_date: string
    tags: string[]
  }
  approved_by_user: boolean
  added_to_calendar: boolean
  created_at: string
}

export interface AISearch {
  id: string
  user_id: string
  search_query: string
  search_parameters: SearchParameters
  status: 'pending' | 'processing' | 'completed' | 'failed'
  results_count: number
  created_at: string
  completed_at: string | null
}

export function useAISearch() {
  const { user } = useAuth()
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [currentSearch, setCurrentSearch] = useState<AISearch | null>(null)
  const [error, setError] = useState<string | null>(null)

  const executeSearch = async (query: string, parameters: SearchParameters = {}) => {
    if (!user) {
      setError('Debe estar autenticado para realizar búsquedas')
      return
    }

    if (!query.trim()) {
      setError('La consulta de búsqueda es requerida')
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])
    setCurrentSearch(null)

    try {
      console.log('🔍 Iniciando búsqueda IA:', { query: query.trim(), parameters })
      
      const { data, error: functionError } = await supabase.functions.invoke('ai-search-convocatorias-optimized', {
        body: {
          search_query: query.trim(),
          search_parameters: parameters
        }
      })

      console.log('🔍 Respuesta de Edge Function:', { data, functionError })

      if (functionError) {
        console.error('❌ Error en función:', functionError)
        throw new Error(functionError.message || 'Error en la búsqueda IA')
      }

      if (data?.error) {
        console.error('❌ Error en data:', data.error)
        throw new Error(data.error.message || 'Error en la búsqueda IA')
      }

      console.log('🔍 Data recibida:', data)

      // Obtener detalles de la búsqueda creada
      const { data: searchData, error: searchError } = await supabase
        .from('ai_searches')
        .select('*')
        .eq('id', data.data.search_id)
        .maybeSingle()

      console.log('🔍 Búsqueda en DB:', { searchData, searchError })

      if (!searchError && searchData) {
        setCurrentSearch(searchData)
      }

      console.log('🔍 Resultados finales:', data.data.results)
      setSearchResults(data.data.results || [])
      
    } catch (err) {
      console.error('❌ Error COMPLETO en búsqueda IA:', err)
      console.error('❌ Stack trace:', err instanceof Error ? err.stack : 'No stack')
      setError(err instanceof Error ? err.message : 'Error desconocido en la búsqueda')
    } finally {
      console.log('🔍 Finalizando búsqueda, isSearching = false')
      setIsSearching(false)
    }
  }

  const approveResults = async (resultIds: string[], addToCalendar = false) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    if (!resultIds || resultIds.length === 0) {
      setError('Debe seleccionar al menos un resultado')
      return false
    }

    try {
      console.log('🟢 Iniciando aprobación:', { resultIds, addToCalendar })
      
      const { data, error: functionError } = await supabase.functions.invoke('approve-results-fixed', {
        body: {
          result_ids: resultIds,
          add_to_calendar: addToCalendar,
          approved: true
        }
      })

      console.log('🟢 Respuesta de aprobación:', { data, functionError })

      if (functionError) {
        console.error('❌ Error en función de aprobación:', functionError)
        throw new Error(functionError.message || 'Error al aprobar resultados')
      }

      if (data?.error) {
        console.error('❌ Error en data de aprobación:', data.error)
        throw new Error(data.error.message || 'Error al aprobar resultados')
      }

      console.log('✅ Aprobación exitosa:', data)

      // Actualizar estado local
      setSearchResults(prev => prev.map(result => 
        resultIds.includes(result.id) 
          ? { ...result, approved_by_user: true, added_to_calendar: addToCalendar }
          : result
      ))

      // Limpiar error si existía
      setError(null)

      return true
    } catch (err) {
      console.error('❌ Error COMPLETO al aprobar resultados:', err)
      console.error('❌ Stack trace:', err instanceof Error ? err.stack : 'No stack')
      setError(err instanceof Error ? err.message : 'Error al aprobar resultados')
      return false
    }
  }

  const rejectResults = async (resultIds: string[]) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    if (!resultIds || resultIds.length === 0) {
      setError('Debe seleccionar al menos un resultado')
      return false
    }

    try {
      console.log('🟡 Iniciando rechazo:', { resultIds })
      
      const { data, error: functionError } = await supabase.functions.invoke('approve-results-fixed', {
        body: {
          result_ids: resultIds,
          approved: false
        }
      })

      console.log('🟡 Respuesta de rechazo:', { data, functionError })

      if (functionError) {
        console.error('❌ Error en función de rechazo:', functionError)
        throw new Error(functionError.message || 'Error al rechazar resultados')
      }

      if (data?.error) {
        console.error('❌ Error en data de rechazo:', data.error)
        throw new Error(data.error.message || 'Error al rechazar resultados')
      }

      console.log('✅ Rechazo exitoso:', data)

      // Actualizar estado local
      setSearchResults(prev => prev.map(result => 
        resultIds.includes(result.id) 
          ? { ...result, approved_by_user: false }
          : result
      ))

      // Limpiar error si existía
      setError(null)

      return true
    } catch (err) {
      console.error('❌ Error COMPLETO al rechazar resultados:', err)
      console.error('❌ Stack trace:', err instanceof Error ? err.stack : 'No stack')
      setError(err instanceof Error ? err.message : 'Error al rechazar resultados')
      return false
    }
  }

  const getUserSearches = async () => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('ai_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al obtener búsquedas:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error al obtener búsquedas del usuario:', err)
      return []
    }
  }

  const getSearchResults = async (searchId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_search_results')
        .select('*')
        .eq('search_id', searchId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al obtener resultados:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('Error al obtener resultados de búsqueda:', err)
      return []
    }
  }

  return {
    isSearching,
    searchResults,
    currentSearch,
    error,
    executeSearch,
    approveResults,
    rejectResults,
    getUserSearches,
    getSearchResults,
    clearError: () => setError(null)
  }
}