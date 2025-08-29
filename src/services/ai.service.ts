// Servicio de IA refactorizado y modular
import { apiClient } from '@/lib/api'

export interface ParseResult {
  success: boolean
  convocatorias?: Array<{
    nombre_concurso: string
    institucion: string
    fecha_cierre: string
    fecha_apertura?: string
    fecha_resultados?: string
    estado: 'abierto' | 'cerrado' | 'en_evaluacion' | 'finalizado'
    tipo_fondo?: string
    area?: string
    monto_financiamiento?: string
    requisitos?: string
    descripcion?: string
    contacto?: string
    sitio_web?: string
    fuente?: string
  }>
  confidence: number
  warnings: string[]
  errors?: string[]
  message?: string
}

export interface ValidationResult {
  isValid: boolean
  score: number
  errors: string[]
  warnings: string[]
  suggestions: string[]
  improvements: Array<{
    field: string
    suggested_value: string
    reason: string
  }>
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
  target_audience: string[]
  success_tips: string[]
  similar_opportunities: string[]
  risk_assessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
  }
}

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

export class AIService {
  async searchConvocatorias(query: string, parameters: any = {}): Promise<{
    search_id: string
    results: SearchResult[]
    results_count: number
    processing_info: any
  }> {
    try {
      const result = await apiClient.searchWithAI(query, parameters)
      return result.data
    } catch (error) {
      console.error('Error en búsqueda IA:', error)
      throw error
    }
  }

  async parseContent(input: {
    content: string
    fileType?: string
    source: 'file' | 'clipboard' | 'url'
  }): Promise<ParseResult> {
    try {
      const result = await apiClient.parseContent(input.content, input.fileType)
      return result
    } catch (error) {
      console.error('Error en parseContent:', error)
      return {
        success: false,
        confidence: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        message: 'Error al procesar contenido'
      }
    }
  }

  async validateConvocatoria(convocatoria: any): Promise<ValidationResult> {
    try {
      const result = await apiClient.validateConvocatoria(convocatoria)
      return result
    } catch (error) {
      console.error('Error en validateConvocatoria:', error)
      return {
        isValid: false,
        score: 0,
        errors: [error instanceof Error ? error.message : 'Error en validación'],
        warnings: [],
        suggestions: [],
        improvements: []
      }
    }
  }

  async enhancePreview(convocatoria: any): Promise<PreviewData> {
    try {
      const result = await apiClient.enhancePreview(convocatoria)
      return result
    } catch (error) {
      console.error('Error en enhancePreview:', error)
      return {
        enhanced_description: 'Error al generar descripción mejorada',
        key_points: [],
        timeline: [],
        requirements_summary: [],
        estimated_competition: 'medium',
        target_audience: [],
        success_tips: [],
        similar_opportunities: [],
        risk_assessment: {
          level: 'medium',
          factors: ['No se pudo evaluar']
        }
      }
    }
  }

  async getRecommendations(filters?: any): Promise<RecommendationResult> {
    try {
      const result = await apiClient.getRecommendations(filters)
      return result
    } catch (error) {
      console.error('Error en getRecommendations:', error)
      return {
        recommendations: [],
        total_found: 0
      }
    }
  }

  async trackSuggestions(criteria: any) {
    try {
      const result = await apiClient.trackSuggestions(criteria)
      return result
    } catch (error) {
      console.error('Error en trackSuggestions:', error)
      return {
        suggestions: [],
        tracking_id: ''
      }
    }
  }

  async processFile(file: File): Promise<ParseResult> {
    try {
      const text = await file.text()
      return await this.parseContent({
        content: text,
        fileType: file.type || 'text/plain',
        source: 'file'
      })
    } catch (error) {
      console.error('Error procesando archivo:', error)
      return {
        success: false,
        confidence: 0,
        warnings: [],
        errors: ['Error al leer el archivo'],
        message: 'No se pudo procesar el archivo'
      }
    }
  }

  async processClipboard(text: string): Promise<ParseResult> {
    return await this.parseContent({
      content: text,
      fileType: 'text/plain',
      source: 'clipboard'
    })
  }

  canUseAI(userPlan: string): boolean {
    return userPlan === 'pro_monthly' || userPlan === 'pro_annual'
  }
}

// Instancia singleton
export const aiService = new AIService()