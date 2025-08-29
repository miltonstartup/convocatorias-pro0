import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

export interface SearchResult {
  id: string
  title: string
  description: string
  deadline: string
  amount: string
  requirements: string
  source_url: string
  validated_data?: {
    organization: string
    category: string
    status: string
    reliability_score: number
    tags: string[]
  }
  approved_by_user?: boolean | null
  approved_at?: string
}

export interface SearchParameters {
  sector?: string
  location?: string
  min_amount?: number
  max_amount?: number
  deadline_from?: string
  deadline_to?: string
  type?: string
}

export type AIProvider = 'openrouter' | 'gemini' | 'smart_flow' | 'google_pse_raw'

interface SearchState {
  results: SearchResult[]
  isSearching: boolean
  error: string | null
  lastSearchId: string | null
}

export function useAISearchReal() {
  const { user, isPro } = useAuth()
  const [state, setState] = useState<SearchState>({
    results: [],
    isSearching: false,
    error: null,
    lastSearchId: null
  })

  const executeSearch = useCallback(async (
    query: string,
    parameters: SearchParameters = {},
    provider: AIProvider = 'smart_flow',
    model: string = 'auto'
  ): Promise<void> => {
    if (!query.trim()) {
      toast.error('Por favor ingresa una consulta de búsqueda')
      return
    }

    if (!user) {
      toast.error('Debes iniciar sesión para usar la búsqueda IA')
      return
    }

    setState(prev => ({
      ...prev,
      isSearching: true,
      error: null
    }))

    try {
      console.log('🔍 Ejecutando búsqueda IA:', { query, provider, model, parameters })

      const result = await apiClient.callEdgeFunction('ai-search-multi-provider', {
        search_query: query,
        search_parameters: parameters,
        ai_provider: provider,
        selected_model: model,
        dev_mode: provider === 'google_pse_raw'
      })

      if (result.error) {
        throw new Error(result.error.message || 'Error en la búsqueda')
      }

      const searchData = result.data
      const results = searchData.results || searchData.raw_google_pse_results || []

      // Transformar resultados si vienen de Google PSE crudo
      const transformedResults: SearchResult[] = results.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        title: item.title || 'Sin título',
        description: item.description || item.snippet || 'Sin descripción',
        deadline: item.deadline || 'No disponible',
        amount: item.amount || 'No especificado',
        requirements: item.requirements || 'Ver enlace original',
        source_url: item.source_url || item.link || '',
        validated_data: {
          organization: item.validated_data?.organization || extractOrganizationFromUrl(item.source_url || item.link || ''),
          category: item.validated_data?.category || 'Financiamiento',
          status: item.validated_data?.status || 'Disponible',
          reliability_score: item.reliability_score || calculateReliabilityScore(item.source_url || item.link || ''),
          tags: item.validated_data?.tags || [query]
        }
      }))

      setState(prev => ({
        ...prev,
        results: transformedResults,
        lastSearchId: searchData.search_id,
        isSearching: false
      }))

      toast.success(`Búsqueda completada: ${transformedResults.length} resultados encontrados`, {
        description: `Procesado con ${provider === 'google_pse_raw' ? 'Google PSE' : provider}`
      })

    } catch (error) {
      console.error('❌ Error en búsqueda IA:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isSearching: false
      }))

      toast.error('Error en la búsqueda', {
        description: errorMessage
      })
    }
  }, [user])

  const approveResults = useCallback(async (
    resultIds: string[],
    addToCalendar: boolean = false
  ): Promise<boolean> => {
    try {
      const result = await apiClient.callEdgeFunction('approve-results-fixed', {
        result_ids: resultIds,
        add_to_calendar: addToCalendar,
        approved: true
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Actualizar estado local
      setState(prev => ({
        ...prev,
        results: prev.results.map(r => 
          resultIds.includes(r.id) 
            ? { ...r, approved_by_user: true, approved_at: new Date().toISOString() }
            : r
        )
      }))

      return true
    } catch (error) {
      console.error('Error aprobando resultados:', error)
      return false
    }
  }, [])

  const rejectResults = useCallback(async (resultIds: string[]): Promise<boolean> => {
    try {
      const result = await apiClient.callEdgeFunction('approve-results-fixed', {
        result_ids: resultIds,
        approved: false
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Actualizar estado local
      setState(prev => ({
        ...prev,
        results: prev.results.map(r => 
          resultIds.includes(r.id) 
            ? { ...r, approved_by_user: false }
            : r
        )
      }))

      return true
    } catch (error) {
      console.error('Error rechazando resultados:', error)
      return false
    }
  }, [])

  const clearResults = useCallback(() => {
    setState({
      results: [],
      isSearching: false,
      error: null,
      lastSearchId: null
    })
  }, [])

  return {
    // Estado
    searchResults: state.results,
    isSearching: state.isSearching,
    searchError: state.error,
    lastSearchId: state.lastSearchId,
    
    // Acciones
    executeSearch,
    approveResults,
    rejectResults,
    clearResults,
    
    // Utilidades
    canUseAI: isPro
  }
}

// Funciones auxiliares
function extractOrganizationFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    
    const organizationMap: { [key: string]: string } = {
      'corfo.cl': 'CORFO',
      'sercotec.cl': 'SERCOTEC',
      'anid.cl': 'ANID',
      'fosis.gob.cl': 'FOSIS',
      'minciencia.gob.cl': 'MinCiencia',
      'economia.gob.cl': 'Ministerio de Economía',
      'fia.cl': 'FIA',
      'cnca.gob.cl': 'CNCA',
      'cntv.cl': 'CNTV'
    }
    
    for (const [domainPattern, org] of Object.entries(organizationMap)) {
      if (domain.includes(domainPattern)) {
        return org
      }
    }
    
    return 'Organización no identificada'
  } catch (error) {
    return 'URL inválida'
  }
}

function calculateReliabilityScore(url: string): number {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    
    // Dominios gubernamentales chilenos tienen alta confiabilidad
    const trustedDomains = [
      'corfo.cl', 'sercotec.cl', 'anid.cl', 'fosis.gob.cl',
      'gob.cl', 'minciencia.gob.cl', 'economia.gob.cl'
    ]
    
    if (trustedDomains.some(trusted => domain.includes(trusted))) {
      return 95
    }
    
    // Dominios .cl tienen confiabilidad media-alta
    if (domain.endsWith('.cl')) {
      return 80
    }
    
    // Otros dominios tienen confiabilidad media
    return 70
  } catch (error) {
    return 50
  }
}