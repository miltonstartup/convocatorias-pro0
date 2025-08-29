// Servicio para integración con OpenRouter API
// Maneja la comunicación con los modelos de IA disponibles

interface OpenRouterRequest {
  model: string
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string
    }
  }[]
}

class OpenRouterService {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions'
  
  // Modelos disponibles según las credenciales proporcionadas
  private models = {
    deepseek: 'deepseek/deepseek-chat-v3-0324:free',
    gemini: 'google/gemini-2.0-flash-exp:free',
    llama: 'meta-llama/llama-3.3-70b-instruct:free'
  }

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
    
    if (!this.apiKey) {
      console.warn('VITE_OPENROUTER_API_KEY not found in environment variables')
    }
  }

  async makeRequest(request: OpenRouterRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Convocatorias Pro - AI Assistant'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      const data: OpenRouterResponse = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('Error calling OpenRouter API:', error)
      throw error
    }
  }

  // Función de utilidad para seleccionar modelo óptimo según tarea
  getOptimalModel(taskType: 'parsing' | 'validation' | 'preview' | 'tracking' | 'recommendation'): string {
    switch (taskType) {
      case 'parsing':
      case 'validation':
        return this.models.deepseek // Eficiente para tareas estructuradas
      case 'preview':
      case 'recommendation':
        return this.models.gemini // Bueno para contenido y sugerencias
      case 'tracking':
        return this.models.llama // Robusto para tareas complejas
      default:
        return this.models.deepseek
    }
  }
}

export const openRouterService = new OpenRouterService()