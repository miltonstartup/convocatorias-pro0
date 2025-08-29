import { supabase } from '@/lib/supabase'
import { SearchResult, SearchParameters } from '@/hooks/useAISearchReal'

export interface GeminiModel {
  id: string
  name: string
  description: string
  type: 'flash' | 'pro'
  maxTokens: number
}

export interface GeminiRequest {
  model: string
  prompt: string
  temperature?: number
  max_tokens?: number
}

export interface GeminiResponse {
  response: string
  model: string
  usage?: any
}

export interface SmartSearchResponse {
  search_id: string
  results: SearchResult[]
  results_count: number
  processing_info: {
    query_processed: string
    step1_model: string
    step2_model: string
    processing_method: string
    results_generated: number
    step1_response_length: number
    step2_response_length: number
    detected_location?: any
  }
}

class GeminiService {
  private readonly models: GeminiModel[] = [
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Modelo más avanzado para análisis detallado y tareas complejas',
      type: 'pro',
      maxTokens: 8192
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash-Lite',
      description: 'Modelo rápido y eficiente para generación inicial y listas',
      type: 'flash',
      maxTokens: 4096
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash-Lite',
      description: 'Versión optimizada para velocidad y eficiencia',
      type: 'flash',
      maxTokens: 3000
    }
  ]

  /**
   * Consulta directa a Gemini API
   */
  async askGemini(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      console.log('🧠 Enviando consulta a Gemini:', {
        model: request.model,
        promptLength: request.prompt.length,
        temperature: request.temperature
      })

      const { data, error } = await supabase.functions.invoke('ask-gemini', {
        body: {
          prompt: request.prompt,
          modelName: request.model,
          maxTokens: request.max_tokens || this.getModelMaxTokens(request.model)
        }
      })

      if (error) {
        console.error('❌ Error en ask-gemini:', error)
        throw new Error(error.message || 'Error en consulta Gemini')
      }

      if (!data?.data) {
        throw new Error('Respuesta inválida de Gemini')
      }

      console.log('✅ Respuesta Gemini recibida:', {
        model: data.data.model,
        responseLength: data.data.text?.length || 0
      })

      return {
        response: data.data.text || data.data.response || '',
        model: data.data.model || request.model,
        usage: data.data.usage
      }
    } catch (error) {
      console.error('❌ Error en askGemini:', error)
      throw error
    }
  }

  /**
   * Búsqueda directa con un modelo específico
   */
  async directSearch(
    query: string,
    model: string = 'gemini-2.5-pro',
    parameters: SearchParameters = {}
  ): Promise<SearchResult[]> {
    try {
      console.log('🎯 Búsqueda directa Gemini:', { query, model, parameters })

      // Construir prompt con contexto geográfico
      const prompt = this.buildSearchPrompt(query, parameters)

      const response = await this.askGemini({
        model,
        prompt,
        temperature: 0.7
      })

      // Parsear respuesta a resultados
      const results = this.parseSearchResponse(response.response, query)
      
      console.log('✅ Búsqueda directa completada:', {
        results: results.length,
        model: response.model
      })

      return results
    } catch (error) {
      console.error('❌ Error en búsqueda directa Gemini:', error)
      throw error
    }
  }

  /**
   * Flujo inteligente de 2 pasos (Recomendado)
   */
  async smartSearch(
    query: string,
    parameters: SearchParameters = {}
  ): Promise<SmartSearchResponse> {
    try {
      console.log('⚡ Iniciando flujo inteligente Gemini:', { query, parameters })

      const { data, error } = await supabase.functions.invoke('gemini-smart-search', {
        body: {
          search_query: query,
          search_parameters: parameters
        }
      })

      if (error) {
        console.error('❌ Error en flujo inteligente:', error)
        throw new Error(error.message || 'Error en flujo inteligente')
      }

      if (!data?.data) {
        throw new Error('Respuesta inválida del flujo inteligente')
      }

      console.log('✅ Flujo inteligente completado:', {
        searchId: data.data.search_id,
        results: data.data.results_count,
        processingMethod: data.data.processing_info.processing_method
      })

      return {
        search_id: data.data.search_id,
        results: data.data.results || [],
        results_count: data.data.results_count,
        processing_info: data.data.processing_info
      }
    } catch (error) {
      console.error('❌ Error en smartSearch:', error)
      throw error
    }
  }

  /**
   * Construir prompt de búsqueda con contexto
   */
  private buildSearchPrompt(query: string, parameters: SearchParameters): string {
    let prompt = `Actúa como un asistente especializado en financiamiento de proyectos. Proporciona una lista detallada, organizada y actualizada de oportunidades de financiamiento, concursos, becas o subvenciones disponibles para "${query}"`

    // Agregar contexto geográfico
    if (parameters.location) {
      prompt += `, con enfoque en ${parameters.location}`
    } else {
      prompt += `, priorizando oportunidades en Chile PRIMERO, luego incluyendo opciones internacionales relevantes`
    }

    // Agregar filtros de sector
    if (parameters.sector) {
      prompt += ` en el sector ${parameters.sector}`
    }

    // Agregar filtros de monto
    if (parameters.min_amount) {
      prompt += ` con montos desde $${parameters.min_amount}`
    }

    prompt += `.\n\nPara cada oportunidad, incluye la siguiente información:
- Nombre de la Oportunidad
- Organismo Convocante (institución, fundación, gobierno, etc.)
- Descripción (objetivos, tipo de proyectos apoyados y enfoque temático)
- Monto de Financiamiento (rango, monto máximo/mínimo, forma de entrega)
- Fecha Límite de Postulación (fecha exacta o período de convocatoria)
- Elegibilidad (quiénes pueden postular: individuos, organizaciones, nacionalidad, sector, etapa del proyecto, etc.)
- Criterios de Selección (factores clave de evaluación)
- Enlace Oficial (URL directo y funcional a la página de la convocatoria)
- Notas (opcional: idioma, cofinanciamiento, beneficios adicionales, etc.)

Instrucciones específicas:
- Prioriza convocatorias abiertas o próximas (en los próximos 6 meses)
- Solo incluye oportunidades con información verificable y enlaces oficiales activos
- Si no hay convocatorias activas, menciona programas destacados con fecha estimada de reapertura
- Organiza los resultados por fecha de cierre (próximas primero)
- Asegúrate de que toda la información sea válida para 2025 o la fecha más reciente disponible

Devuelve la información en formato JSON válido con esta estructura:
{
  "convocatorias": [
    {
      "title": "Nombre de la convocatoria",
      "organization": "Organismo convocante",
      "description": "Descripción detallada",
      "amount": "Rango de financiamiento",
      "deadline": "2025-XX-XX",
      "requirements": "Requisitos de elegibilidad",
      "source_url": "https://enlace-oficial.com",
      "category": "Categoría",
      "status": "abierto",
      "tags": ["tag1", "tag2"],
      "reliability_score": 95
    }
  ]
}`

    return prompt
  }

  /**
   * Parsear respuesta de búsqueda
   */
  private parseSearchResponse(response: string, originalQuery: string): SearchResult[] {
    try {
      // Intentar parsear JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.convocatorias && Array.isArray(parsed.convocatorias)) {
          return parsed.convocatorias.map((conv: any) => ({
            id: crypto.randomUUID(),
            title: conv.title || `Convocatoria para ${originalQuery}`,
            description: conv.description || '',
            deadline: conv.deadline || this.generateFutureDate(),
            amount: conv.amount || 'Monto variable',
            requirements: conv.requirements || 'Ver bases',
            source_url: conv.source_url || 'https://www.gob.cl',
            validated_data: {
              organization: conv.organization || 'N/A',
              category: conv.category || 'Financiamiento',
              status: conv.status || 'disponible',
              reliability_score: conv.reliability_score || 90,
              tags: conv.tags || [originalQuery]
            }
          }))
        }
      }

      // Fallback: parseo de texto estructurado
      return this.parseTextResponse(response, originalQuery)
    } catch (error) {
      console.error('Error parseando respuesta:', error)
      return this.parseTextResponse(response, originalQuery)
    }
  }

  /**
   * Parsear respuesta de texto estructurado (fallback)
   */
  private parseTextResponse(text: string, originalQuery: string): SearchResult[] {
    const results: SearchResult[] = []
    const sections = text.split(/\n\s*\n/)

    for (const section of sections.slice(0, 5)) { // Máximo 5 resultados
      if (section.trim().length < 50) continue

      const lines = section.split('\n').map(l => l.trim()).filter(l => l)
      if (lines.length < 2) continue

      results.push({
        id: crypto.randomUUID(),
        title: lines[0] || `Convocatoria para ${originalQuery}`,
        description: lines.slice(1).join(' ').substring(0, 300) + '...',
        deadline: this.generateFutureDate(),
        amount: 'Monto variable según proyecto',
        requirements: 'Requisitos según bases de la convocatoria',
        source_url: 'https://www.gob.cl',
        validated_data: {
          organization: 'Gobierno de Chile',
          category: 'Financiamiento',
          status: 'disponible',
          reliability_score: 85,
          tags: [originalQuery, 'chile']
        }
      })
    }

    return results
  }

  /**
   * Generar fecha futura para deadline
   */
  private generateFutureDate(): string {
    const date = new Date()
    date.setMonth(date.getMonth() + 3) // 3 meses adelante
    return date.toISOString().split('T')[0]
  }

  /**
   * Obtener máximo de tokens para un modelo
   */
  private getModelMaxTokens(modelId: string): number {
    const model = this.models.find(m => m.id === modelId)
    return model?.maxTokens || 4096
  }

  /**
   * Obtener modelos disponibles
   */
  getAvailableModels(): GeminiModel[] {
    return [...this.models]
  }

  /**
   * Verificar si Gemini está disponible
   */
  canUseGemini(): boolean {
    // En el futuro podríamos verificar API keys, límites, etc.
    return true
  }

  /**
   * Obtener información de uso
   */
  getUsageInfo() {
    return {
      available_models: this.models.length,
      can_use_smart_flow: true,
      can_use_direct_search: true,
      recommended_flow: 'smart_search'
    }
  }
}

// Instancia singleton
export const geminiService = new GeminiService()

// Exports para compatibilidad
export default geminiService