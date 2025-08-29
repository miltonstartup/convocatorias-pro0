import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface SearchResult {
  id: string
  title: string
  description: string
  deadline?: string
  amount?: string
  requirements?: string
  source_url?: string
  approved_by_user?: boolean | null
  added_to_calendar?: boolean
  ai_model_used?: string
  ai_models_used?: string[]
  ai_confidence?: 'high' | 'medium' | 'low'
  ai_cross_validated?: boolean
  validated_data?: {
    organization?: string
    category?: string
    status?: string
    reliability_score?: number
    tags?: string[]
  }
}

export interface SearchParameters {
  sector?: string
  location?: string
  min_amount?: string
  max_amount?: string
  deadline_from?: string
  deadline_to?: string
}

export interface ProcessingInfo {
  web_results_found: number
  ai_processed: number
  links_validated: number
  final_count: number
}

export function useAISearchReal() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null)
  const [processingInfo, setProcessingInfo] = useState<ProcessingInfo | null>(null)
  const [currentStep, setCurrentStep] = useState<string>('web-search')
  
  const supabaseClient = supabase

  const executeSearch = useCallback(async (
    query: string, 
    parameters: SearchParameters = {},
    aiProvider: 'openrouter' | 'gemini' | 'smart_flow' = 'openrouter',
    selectedModel: string = 'auto'
  ): Promise<{ searchId: string; results: SearchResult[] }> => {
    if (!query.trim()) {
      throw new Error('La consulta de búsqueda es requerida')
    }

    setIsSearching(true)
    setSearchResults([])
    setCurrentSearchId(null)
    setProcessingInfo(null)
    setCurrentStep('web-search')

    try {
      console.log('🔎 Iniciando búsqueda IA con múltiples proveedores:', { 
        query, 
        parameters, 
        aiProvider, 
        selectedModel 
      })
      
      // Obtener token de sesión
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Sesión no válida. Por favor, inicia sesión nuevamente.')
      }

      // Simular progreso de pasos según el proveedor
      const steps = aiProvider === 'smart_flow' 
        ? ['step1-flash', 'step2-pro', 'refinement']
        : ['web-search', 'ai-processing', 'link-validation', 'refinement']
      let stepIndex = 0
      
      const progressInterval = setInterval(() => {
        if (stepIndex < steps.length - 1) {
          stepIndex++
          setCurrentStep(steps[stepIndex])
        }
      }, aiProvider === 'smart_flow' ? 3000 : 2000)

      // Llamar al edge function de búsqueda multi-proveedor
      const { data, error } = await supabaseClient.functions.invoke('ai-search-convocatorias-optimized', {
        body: {
          search_query: query.trim(),
          search_parameters: parameters,
          ai_provider: aiProvider,
          selected_model: selectedModel
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      clearInterval(progressInterval)
      setCurrentStep('refinement')

      if (error) {
        console.error('Error en búsqueda IA multi-proveedor:', error)
        throw new Error(error.message || 'Error al ejecutar búsqueda IA')
      }

      if (!data?.data) {
        throw new Error('Respuesta inválida del servidor')
      }

      const { search_id, results, processing_info } = data.data
      
      console.log('✅ Búsqueda IA multi-proveedor completada:', {
        searchId: search_id,
        resultsCount: results.length,
        processingInfo: processing_info
      })

      setCurrentSearchId(search_id)
      setSearchResults(results)
      
      // Adaptar processing_info para compatibilidad
      const adaptedProcessingInfo = {
        web_results_found: results.length,
        ai_processed: results.length,
        links_validated: results.length,
        final_count: results.length,
        ...processing_info
      }
      setProcessingInfo(adaptedProcessingInfo)
      
      const providerName = aiProvider === 'smart_flow' ? 'Flujo Inteligente' :
                          aiProvider === 'gemini' ? 'Gemini Directo' : 'OpenRouter'
      
      toast.success(`Búsqueda completada: ${results.length} convocatorias encontradas`, {
        description: `Procesado con ${providerName} - ${processing_info?.ai_provider || aiProvider}`
      })

      return {
        searchId: search_id,
        results
      }

    } catch (error) {
      console.error('❌ Error en búsqueda IA multi-proveedor:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido en búsqueda IA'
      
      toast.error('Error en búsqueda IA', {
        description: errorMessage
      })
      
      throw error
    } finally {
      setIsSearching(false)
    }
  }, [supabase])

  const approveResults = useCallback(async (
    resultIds: string[], 
    addToCalendar = false
  ): Promise<boolean> => {
    try {
      console.log('🟢 Aprobando resultados:', { resultIds, addToCalendar })
      
      const { error } = await supabaseClient.functions.invoke('approve-results-fixed', {
        body: {
          result_ids: resultIds,
          add_to_calendar: addToCalendar
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al aprobar resultados')
      }

      // Actualizar estado local
      setSearchResults(prev => prev.map(result => 
        resultIds.includes(result.id) 
          ? { 
              ...result, 
              approved_by_user: true, 
              added_to_calendar: addToCalendar 
            }
          : result
      ))

      toast.success(
        `${resultIds.length} convocatoria${resultIds.length !== 1 ? 's' : ''} aprobada${resultIds.length !== 1 ? 's' : ''}`,
        {
          description: addToCalendar ? 'Añadidas al calendario' : 'Guardadas en tu lista'
        }
      )

      return true
    } catch (error) {
      console.error('❌ Error aprobando resultados:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error al aprobar'
      toast.error('Error al aprobar', { description: errorMessage })
      
      return false
    }
  }, [supabase])

  const rejectResults = useCallback(async (resultIds: string[]): Promise<boolean> => {
    try {
      console.log('🟡 Rechazando resultados:', { resultIds })
      
      const { error } = await supabaseClient.functions.invoke('approve-results-fixed', {
        body: {
          result_ids: resultIds,
          approved: false
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al rechazar resultados')
      }

      // Actualizar estado local
      setSearchResults(prev => prev.map(result => 
        resultIds.includes(result.id) 
          ? { ...result, approved_by_user: false }
          : result
      ))

      toast.success(
        `${resultIds.length} convocatoria${resultIds.length !== 1 ? 's' : ''} rechazada${resultIds.length !== 1 ? 's' : ''}`
      )

      return true
    } catch (error) {
      console.error('❌ Error rechazando resultados:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error al rechazar'
      toast.error('Error al rechazar', { description: errorMessage })
      
      return false
    }
  }, [supabase])

  return {
    // Estado
    isSearching,
    searchResults,
    currentSearchId,
    processingInfo,
    currentStep,
    
    // Acciones
    executeSearch,
    approveResults,
    rejectResults,
    
    // Utilidades
    clearResults: () => {
      setSearchResults([])
      setCurrentSearchId(null)
      setProcessingInfo(null)
    }
  }
}