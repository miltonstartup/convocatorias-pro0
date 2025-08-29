import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { SearchParameters } from './useAISearch'

export interface SavedSearch {
  id: string
  user_id: string
  search_name: string
  original_query: string
  search_parameters: SearchParameters
  last_run: string | null
  is_favorite: boolean
  created_at: string
}

export function useSavedSearches() {
  const { user } = useAuth()
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSavedSearches = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      setSavedSearches(data || [])
    } catch (err) {
      console.error('Error al cargar búsquedas guardadas:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar búsquedas guardadas')
    } finally {
      setIsLoading(false)
    }
  }

  const saveSearch = async (searchName: string, originalQuery: string, searchParameters: SearchParameters = {}, isFavorite = false) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    if (!searchName.trim()) {
      setError('El nombre de la búsqueda es requerido')
      return false
    }

    try {
      const { data, error: functionError } = await supabase.functions.invoke('save-search', {
        body: {
          search_name: searchName.trim(),
          original_query: originalQuery.trim(),
          search_parameters: searchParameters,
          is_favorite: isFavorite
        }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Error al guardar búsqueda')
      }

      if (data?.error) {
        throw new Error(data.error.message || 'Error al guardar búsqueda')
      }

      // Recargar búsquedas guardadas
      await loadSavedSearches()
      
      return true
    } catch (err) {
      console.error('Error al guardar búsqueda:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar búsqueda')
      return false
    }
  }

  const deleteSavedSearch = async (searchId: string) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Actualizar estado local
      setSavedSearches(prev => prev.filter(search => search.id !== searchId))
      
      return true
    } catch (err) {
      console.error('Error al eliminar búsqueda guardada:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar búsqueda guardada')
      return false
    }
  }

  const toggleFavorite = async (searchId: string) => {
    if (!user) {
      setError('Debe estar autenticado')
      return false
    }

    try {
      const search = savedSearches.find(s => s.id === searchId)
      if (!search) {
        throw new Error('Búsqueda no encontrada')
      }

      const { error } = await supabase
        .from('saved_searches')
        .update({ is_favorite: !search.is_favorite })
        .eq('id', searchId)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      // Actualizar estado local
      setSavedSearches(prev => prev.map(s => 
        s.id === searchId 
          ? { ...s, is_favorite: !s.is_favorite }
          : s
      ))
      
      return true
    } catch (err) {
      console.error('Error al actualizar favorito:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar favorito')
      return false
    }
  }

  const updateLastRun = async (searchId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ last_run: new Date().toISOString() })
        .eq('id', searchId)
        .eq('user_id', user.id)

      if (!error) {
        // Actualizar estado local
        setSavedSearches(prev => prev.map(s => 
          s.id === searchId 
            ? { ...s, last_run: new Date().toISOString() }
            : s
        ))
      }
    } catch (err) {
      console.error('Error al actualizar última ejecución:', err)
    }
  }

  // Cargar búsquedas guardadas al montar el componente
  useEffect(() => {
    if (user) {
      loadSavedSearches()
    } else {
      setSavedSearches([])
    }
  }, [user])

  return {
    savedSearches,
    isLoading,
    error,
    saveSearch,
    deleteSavedSearch,
    toggleFavorite,
    updateLastRun,
    refreshSavedSearches: loadSavedSearches,
    clearError: () => setError(null)
  }
}