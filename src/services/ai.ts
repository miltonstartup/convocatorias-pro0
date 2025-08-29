// Servicio centralizado para interactuar con los agentes de IA
// Este archivo actúa como puente entre el frontend y las Edge Functions de IA

import { supabase } from '@/lib/supabase'

// Tipos de datos para los resultados de los agentes
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

export interface ExportRequest {
  format: 'csv' | 'pdf'
  filters?: {
    status?: string
    organization?: string
    category?: string
    date_from?: string
    date_to?: string
    search?: string
  }
  options?: {
    include_description?: boolean
    include_requirements?: boolean
    sort_by?: 'date' | 'name' | 'institution'
    sort_order?: 'asc' | 'desc'
  }
}

export interface ExportResult {
  success: boolean
  format: 'csv' | 'pdf'
  content?: string
  filename: string
  total_records: number
  generated_at: string
  download_url?: string
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

/**
 * Servicio centralizado para interactuar con los agentes de IA
 * Proporciona una interfaz limpia para llamar a las Edge Functions
 */
class AIService {


  /**
   * Parser Agent: Extrae información de convocatorias desde texto, archivos o URLs
   */
  async parseContent(input: {
    content: string
    fileType?: string
    source: 'file' | 'clipboard' | 'url'
  }): Promise<ParseResult> {
    try {
      const result = await this.callEdgeFunction<ParseResult>('parse-content', input)
      return result
    } catch (error) {
      console.error('Error en parseContent:', error)
      return {
        success: false,
        confidence: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        message: 'Error al procesar el contenido'
      }
    }
  }

  /**
   * Validator Agent: Valida y verifica información de convocatorias
   */
  async validateConvocatoria(convocatoria: any): Promise<ValidationResult> {
    try {
      const result = await this.callEdgeFunction<ValidationResult>('validate-convocatoria', {
        convocatoria
      })
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

  /**
   * Preview Agent: Enriquece la información de convocatorias con IA
   */
  async enhancePreview(convocatoria: any): Promise<PreviewData> {
    try {
      const result = await this.callEdgeFunction<PreviewData>('enhance-preview', {
        convocatoria
      })
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

  /**
   * Export Agent: Exporta datos a PDF o CSV con filtros avanzados
   */
  async exportData(request: ExportRequest): Promise<ExportResult> {
    try {
      const result = await this.callEdgeFunction<any>('export-data', request)
      
      if (request.format === 'csv') {
        // Para CSV, el contenido viene directamente
        return {
          success: true,
          format: 'csv',
          content: result,
          filename: `convocatorias_${new Date().toISOString().split('T')[0]}.csv`,
          total_records: 0,
          generated_at: new Date().toISOString()
        }
      } else {
        // Para PDF, viene estructurado
        return result
      }
    } catch (error) {
      console.error('Error en exportData:', error)
      throw error
    }
  }

  /**
   * Tracker Agent: Rastrea y sugiere nuevas convocatorias
   */
  async trackSuggestions(criteria: {
    areas?: string[]
    organizations?: string[]
    keywords?: string[]
    max_amount?: number
    min_amount?: number
  }): Promise<{ suggestions: any[], tracking_id: string }> {
    try {
      const result = await this.callEdgeFunction('track-suggestions', criteria)
      return result
    } catch (error) {
      console.error('Error en trackSuggestions:', error)
      return {
        suggestions: [],
        tracking_id: ''
      }
    }
  }

  /**
   * Recommender Agent: Recomendaciones personalizadas basadas en historial
   */
  async getRecommendations(filters?: {
    area?: string
    tipo_fondo?: string
    monto_min?: number
    monto_max?: number
  }): Promise<RecommendationResult> {
    try {
      const result = await this.callEdgeFunction<RecommendationResult>('get-recommendations', {
        filters: filters || {}
      })
      return result
    } catch (error) {
      console.error('Error en getRecommendations:', error)
      return {
        recommendations: [],
        total_found: 0
      }
    }
  }

  /**
   * Procesar archivo directamente (drag & drop)
   */
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

  /**
   * Procesar contenido desde clipboard
   */
  async processClipboard(text: string): Promise<ParseResult> {
    return await this.parseContent({
      content: text,
      fileType: 'text/plain',
      source: 'clipboard'
    })
  }

  /**
   * Verificar si el usuario puede usar funciones IA basado en su plan
   */
  canUseAI(userPlan: string): boolean {
    return userPlan === 'pro_monthly' || userPlan === 'pro_annual'
  }

  /**
   * Generar headers de autenticación para las Edge Functions
   */
  private async getAuthHeaders(): Promise<{ [key: string]: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No hay sesión activa')
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  }

  /**
   * Método actualizado para llamar a las Edge Functions con autenticación
   */
  private async callEdgeFunction<T>(functionName: string, payload: any): Promise<T> {
    try {
      // Obtener headers de autenticación
      const authHeaders = await this.getAuthHeaders()
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: authHeaders
      })

      if (error) {
        console.error(`Error en Edge Function ${functionName}:`, error)
        throw new Error(`Error en ${functionName}: ${error.message || 'Error desconocido'}`)
      }

      return data
    } catch (error) {
      console.error(`Error al llamar a ${functionName}:`, error)
      throw error
    }
  }

  /**
   * Descargar archivo CSV
   */
  downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Abrir PDF en nueva ventana
   */
  openPDF(htmlContent: string): void {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(htmlContent)
      newWindow.document.close()
    }
  }

  /**
   * Método de utilidad para limpiar y preparar texto antes del procesamiento
   */
  cleanText(text: string): string {
    return text
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
  }

  /**
   * Valida si una URL es válida
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// Exporta una instancia del servicio
export const aiService = new AIService()
export default aiService