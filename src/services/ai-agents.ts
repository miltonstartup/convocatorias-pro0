// Servicios para los agentes de IA (Edge Functions)
import { supabase } from '@/lib/supabase'

export interface ParseResult {
  success: boolean
  convocatorias?: Array<{
    nombre_concurso: string
    institucion?: string
    fecha_cierre: string
    fecha_apertura?: string
    fecha_resultados?: string
    estado: 'abierto' | 'cerrado' | 'en_evaluacion' | 'finalizado'
    tipo_fondo?: string
    area?: string
    monto_financiamiento?: string
    requisitos?: string
    fuente?: string
  }>
  errors?: string[]
  message?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  score: number
}

export interface PreviewData {
  enhanced_description: string
  key_points: string[]
  timeline: Array<{
    date: string
    event: string
    importance: 'high' | 'medium' | 'low'
  }>
  requirements_summary: string[]
  estimated_competition: 'low' | 'medium' | 'high'
}

export interface RecommendationResult {
  recommendations: Array<{
    id: string
    title: string
    organization: string
    match_score: number
    reasons: string[]
    deadline: string
    amount?: string
  }>
  total_found: number
}

class AIAgentsService {
  private async callEdgeFunction<T>(functionName: string, payload: any): Promise<T> {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    })

    if (error) {
      throw new Error(`Error en ${functionName}: ${error.message}`)
    }

    return data
  }

  /**
   * Agente Parser: Extrae información de convocatorias desde texto, archivos o URLs
   */
  async parseContent(input: {
    type: 'text' | 'file' | 'url'
    content: string
    filename?: string
  }): Promise<ParseResult> {
    try {
      return await this.callEdgeFunction<ParseResult>('parse-content', input)
    } catch (error) {
      console.error('Error en parseContent:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        message: 'Error al procesar el contenido'
      }
    }
  }

  /**
   * Agente Validator: Valida y verifica información de convocatorias
   */
  async validateConvocatoria(convocatoria: any): Promise<ValidationResult> {
    try {
      return await this.callEdgeFunction<ValidationResult>('validate-convocatoria', {
        convocatoria
      })
    } catch (error) {
      console.error('Error en validateConvocatoria:', error)
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Error en validación'],
        warnings: [],
        suggestions: [],
        score: 0
      }
    }
  }

  /**
   * Agente Preview: Enriquece la información de convocatorias con IA
   */
  async enhancePreview(convocatoria: any): Promise<PreviewData> {
    try {
      return await this.callEdgeFunction<PreviewData>('enhance-preview', {
        convocatoria
      })
    } catch (error) {
      console.error('Error en enhancePreview:', error)
      return {
        enhanced_description: 'Error al generar descripción mejorada',
        key_points: [],
        timeline: [],
        requirements_summary: [],
        estimated_competition: 'medium'
      }
    }
  }

  /**
   * Agente Tracker: Rastrea y sugiere nuevas convocatorias
   */
  async trackSuggestions(criteria: {
    areas?: string[]
    organizations?: string[]
    keywords?: string[]
    max_amount?: number
    min_amount?: number
  }): Promise<{ suggestions: any[], tracking_id: string }> {
    try {
      return await this.callEdgeFunction('track-suggestions', criteria)
    } catch (error) {
      console.error('Error en trackSuggestions:', error)
      return {
        suggestions: [],
        tracking_id: ''
      }
    }
  }

  /**
   * Agente Recommender: Recomendaciones personalizadas basadas en historial
   */
  async getRecommendations(filters?: {
    area?: string
    tipo_fondo?: string
    monto_min?: number
    monto_max?: number
  }): Promise<RecommendationResult> {
    try {
      return await this.callEdgeFunction<RecommendationResult>('get-recommendations', {
        filters: filters || {}
      })
    } catch (error) {
      console.error('Error en getRecommendations:', error)
      return {
        recommendations: [],
        total_found: 0
      }
    }
  }

  /**
   * Función auxiliar para validar si el usuario puede usar funciones IA
   */
  canUseAI(userPlan: string): boolean {
    return userPlan === 'pro_monthly' || userPlan === 'pro_annual'
  }

  /**
   * Procesar múltiples convocatorias en lote
   */
  async batchProcess(convocatorias: any[]): Promise<{
    parsed: ParseResult[]
    validated: ValidationResult[]
    enhanced: PreviewData[]
  }> {
    const results = {
      parsed: [],
      validated: [],
      enhanced: []
    }

    for (const conv of convocatorias) {
      try {
        const validated = await this.validateConvocatoria(conv)
        const enhanced = await this.enhancePreview(conv)
        
        results.validated.push(validated)
        results.enhanced.push(enhanced)
      } catch (error) {
        console.error('Error en batch process:', error)
      }
    }

    return results
  }
}

// Instancia singleton del servicio
export const aiAgentsService = new AIAgentsService()
