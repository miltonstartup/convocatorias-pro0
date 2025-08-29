// Hook para usar los agentes de IA
import { useState } from 'react'
import { aiService, ParseResult, ValidationResult, PreviewData, RecommendationResult } from '@/services/ai'
import { useAuth } from './useAuth'
import { usePlans } from './usePlans'
import { toast } from 'sonner'

export function useAI() {
  const { user, isPro } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)

  const checkAIAccess = () => {
    if (!user) {
      toast.error('Debes iniciar sesión para usar las funciones de IA')
      return false
    }

    // Verificar directamente si el usuario es Pro usando el hook actualizado
    console.log('🤖 AI Access Check:', { user: !!user, isPro, userEmail: user?.email })
    
    if (!isPro) {
      toast.error('Las funciones de IA requieren Plan Pro', {
        action: {
          label: 'Ver Planes',
          onClick: () => window.location.href = '/plans'
        }
      })
      return false
    }

    return true
  }

  const parseContent = async (input: {
    content: string
    fileType?: string
    source: 'file' | 'clipboard' | 'url'
  }): Promise<ParseResult | null> => {
    if (!checkAIAccess()) return null

    try {
      setIsProcessing(true)
      const result = await aiService.parseContent(input)
      
      if (result.success) {
        toast.success(`✨ IA extrajo ${result.convocatorias?.length || 0} convocatorias`)
      } else {
        toast.error('Error al procesar contenido', {
          description: result.errors?.[0] || 'Error desconocido'
        })
      }
      
      return result
    } catch (error) {
      toast.error('Error en el procesamiento con IA')
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  const validateConvocatoria = async (convocatoria: any): Promise<ValidationResult | null> => {
    if (!checkAIAccess()) return null

    try {
      setIsProcessing(true)
      const result = await aiService.validateConvocatoria(convocatoria)
      
      if (result.isValid) {
        toast.success(`✅ Validación completa (Score: ${result.score}/100)`)
      } else {
        toast.warning('Se encontraron problemas en la validación', {
          description: `${result.errors.length} errores, ${result.warnings.length} advertencias`
        })
      }
      
      return result
    } catch (error) {
      toast.error('Error en la validación con IA')
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  const enhancePreview = async (convocatoria: any): Promise<PreviewData | null> => {
    if (!checkAIAccess()) return null

    try {
      setIsProcessing(true)
      const result = await aiService.enhancePreview(convocatoria)
      toast.success('🚀 Vista previa enriquecida con IA')
      return result
    } catch (error) {
      toast.error('Error al enriquecer vista previa')
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  const getRecommendations = async (filters?: any): Promise<RecommendationResult | null> => {
    if (!checkAIAccess()) return null

    try {
      setIsProcessing(true)
      const result = await aiService.getRecommendations(filters)
      
      if (result.total_found > 0) {
        toast.success(`🎯 Encontré ${result.total_found} convocatorias relevantes`)
      } else {
        toast.info('No se encontraron recomendaciones con los filtros actuales')
      }
      
      return result
    } catch (error) {
      toast.error('Error al obtener recomendaciones')
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  const trackSuggestions = async (criteria: any) => {
    if (!checkAIAccess()) return null

    try {
      setIsProcessing(true)
      const result = await aiService.trackSuggestions(criteria)
      toast.success('📡 Configurado rastreo automático')
      return result
    } catch (error) {
      toast.error('Error al configurar rastreo')
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  // Funciones adicionales específicas para la UI
  const parseFile = async (file: File): Promise<ParseResult | null> => {
    if (!checkAIAccess()) return null

    try {
      setIsProcessing(true)
      const result = await aiService.processFile(file)
      
      if (result.success) {
        toast.success(`✨ IA extrajo ${result.convocatorias?.length || 0} convocatorias`)
      } else {
        toast.error('Error al procesar archivo', {
          description: result.errors?.[0] || 'Error desconocido'
        })
      }
      
      return result
    } catch (error) {
      toast.error('Error en el procesamiento del archivo')
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  const parseClipboard = async (text: string): Promise<ParseResult | null> => {
    if (!checkAIAccess()) return null

    try {
      setIsProcessing(true)
      const result = await aiService.processClipboard(text)
      
      if (result.success) {
        toast.success(`✨ IA extrajo ${result.convocatorias?.length || 0} convocatorias`)
      } else {
        toast.error('Error al procesar contenido', {
          description: result.errors?.[0] || 'Error desconocido'
        })
      }
      
      return result
    } catch (error) {
      toast.error('Error en el procesamiento del clipboard')
      return null
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    // Funciones principales
    parseContent,
    parseFile,
    parseClipboard,
    validateConvocatoria,
    enhancePreview,
    getRecommendations,
    trackSuggestions,
    
    // Estado
    isProcessing,
    
    // Utilidades
    checkAIAccess,
    canUseAI: isPro
  }
}
