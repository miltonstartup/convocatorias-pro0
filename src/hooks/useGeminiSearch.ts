// Hook personalizado para búsquedas con Gemini 2.5
// Incluye búsqueda directa y flujo inteligente de 2 pasos optimizado

import { useState, useCallback } from 'react'
import { geminiService, SmartSearchResponse, GeminiModel } from '@/services/gemini'
import { SearchResult, SearchParameters } from './useAISearchReal'
import { toast } from 'sonner'
import { useAuth } from './useAuth'

export interface GeminiSearchState {
  isSearching: boolean
  currentStep: 'step1' | 'step2' | 'completed' | 'idle'
  stepProgress: {
    step1_completed: boolean
    step2_completed: boolean
    step1_results?: string
    step2_results?: SearchResult[]
  }
  currentMessage: string
  progress: number
}

export function useGeminiSearch() {
  const { user } = useAuth()
  const [searchState, setSearchState] = useState<GeminiSearchState>({
    isSearching: false,
    currentStep: 'idle',
    stepProgress: {
      step1_completed: false,
      step2_completed: false
    },
    currentMessage: 'Listo para buscar',
    progress: 0
  })
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [lastSearchResponse, setLastSearchResponse] = useState<SmartSearchResponse | null>(null)

  /**
   * Flujo inteligente de búsqueda Gemini 2.5 (Recomendado)
   * Paso 1: Gemini 2.5 Flash-Lite para lista rápida
   * Paso 2: Gemini 2.5 Pro para análisis detallado
   */
  const executeSmartSearch = useCallback(async (
    query: string,
    parameters: SearchParameters = {}
  ): Promise<SmartSearchResponse> => {
    if (!query.trim()) {
      throw new Error('La consulta de búsqueda es requerida')
    }

    // Inicializar estado
    setSearchState({
      isSearching: true,
      currentStep: 'step1',
      stepProgress: {
        step1_completed: false,
        step2_completed: false
      },
      currentMessage: 'Paso 1/2: Generando lista rápida con Gemini 2.5 Flash-Lite...',
      progress: 15
    })
    setSearchResults([])
    setLastSearchResponse(null)

    try {
      console.log('🧠 Iniciando flujo inteligente Gemini 2.5:', { query, parameters })
      
      // Simular progreso del Paso 1
      setTimeout(() => {
        setSearchState(prev => ({
          ...prev,
          currentStep: 'step2',
          stepProgress: {
            ...prev.stepProgress,
            step1_completed: true
          },
          currentMessage: 'Paso 2/2: Procesamiento detallado con Gemini 2.5 Pro...',
          progress: 65
        }))
      }, 3000)

      // Ejecutar búsqueda inteligente
      const response = await geminiService.smartSearch(query, parameters)
      
      // Actualizar estado final
      setSearchState(prev => ({
        ...prev,
        currentStep: 'completed',
        stepProgress: {
          step1_completed: true,
          step2_completed: true,
          step2_results: response.results
        },
        currentMessage: `Completado: ${response.results.length} convocatorias encontradas`,
        progress: 100,
        isSearching: false
      }))

      setSearchResults(response.results)
      setLastSearchResponse(response)
      
      toast.success(`Flujo inteligente completado: ${response.results.length} convocatorias encontradas`, {
        description: `Procesado con Gemini 2.5 Flash-Lite + Pro (${response.processing_info.processing_method})`
      })

      return response

    } catch (error) {
      console.error('❌ Error en flujo inteligente:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error en flujo inteligente'
      
      // Reset estado en caso de error
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        currentMessage: 'Error en el proceso',
        progress: 0
      }))
      
      toast.error('Error en flujo inteligente Gemini 2.5', {
        description: errorMessage
      })
      
      throw error
    }
  }, [])

  /**
   * Búsqueda directa con Gemini 2.5 Pro
   */
  const executeDirectSearch = useCallback(async (
    query: string,
    model: string = 'gemini-2.5-pro',
    parameters: SearchParameters = {}
  ): Promise<SearchResult[]> => {
    if (!query.trim()) {
      throw new Error('La consulta de búsqueda es requerida')
    }

    setSearchState({
      isSearching: true,
      currentStep: 'step1',
      stepProgress: {
        step1_completed: false,
        step2_completed: false
      },
      currentMessage: `Procesando con ${model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash-Lite'}...`,
      progress: 50
    })
    setSearchResults([])

    try {
      console.log('🎯 Iniciando búsqueda directa Gemini 2.5:', { query, model, parameters })
      
      const results = await geminiService.directSearch(query, model, parameters)
      
      setSearchState({
        isSearching: false,
        currentStep: 'completed',
        stepProgress: {
          step1_completed: true,
          step2_completed: true,
          step2_results: results
        },
        currentMessage: `Completado: ${results.length} convocatorias encontradas`,
        progress: 100
      })

      setSearchResults(results)
      
      const modelName = model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash-Lite'
      toast.success(`Búsqueda directa completada: ${results.length} convocatorias encontradas`, {
        description: `Procesado con ${modelName}`
      })

      return results

    } catch (error) {
      console.error('❌ Error en búsqueda directa:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error en búsqueda directa'
      
      setSearchState(prev => ({
        ...prev,
        isSearching: false,
        currentMessage: 'Error en el proceso',
        progress: 0
      }))
      
      toast.error('Error en búsqueda directa Gemini 2.5', {
        description: errorMessage
      })
      
      throw error
    }
  }, [])

  /**
   * Consulta simple a Gemini (para otras funcionalidades)
   */
  const askGemini = useCallback(async (
    prompt: string,
    model: string = 'gemini-2.5-pro',
    options?: {
      temperature?: number
      max_tokens?: number
    }
  ): Promise<string> => {
    try {
      const response = await geminiService.askGemini({
        model,
        prompt,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.max_tokens || (model.includes('flash') ? 3000 : 6000)
      })
      
      return response.response
    } catch (error) {
      console.error('❌ Error en consulta Gemini:', error)
      throw error
    }
  }, [])

  /**
   * Obtener modelos disponibles
   */
  const getAvailableModels = useCallback((): GeminiModel[] => {
    return geminiService.getAvailableModels()
  }, [])

  /**
   * Limpiar resultados
   */
  const clearResults = useCallback(() => {
    setSearchResults([])
    setLastSearchResponse(null)
    setSearchState({
      isSearching: false,
      currentStep: 'idle',
      stepProgress: {
        step1_completed: false,
        step2_completed: false
      },
      currentMessage: 'Listo para buscar',
      progress: 0
    })
  }, [])

  /**
   * Obtener estado del progreso para UI
   */
  const getProgressState = useCallback(() => {
    return {
      progress: searchState.progress,
      message: searchState.currentMessage
    }
  }, [searchState])

  return {
    // Estado
    searchState,
    searchResults,
    lastSearchResponse,
    isSearching: searchState.isSearching,
    
    // Acciones principales
    executeSmartSearch,
    executeDirectSearch,
    askGemini,
    
    // Utilidades
    getAvailableModels,
    clearResults,
    getProgressState,
    
    // Información
    canUseGemini: geminiService.canUseGemini(),
    usageInfo: geminiService.getUsageInfo()
  }
}
