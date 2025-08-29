// Cliente API centralizado para todas las llamadas a Edge Functions
import { supabase } from './supabase'

export class APIClient {
  private static instance: APIClient
  
  static getInstance(): APIClient {
    if (!APIClient.instance) {
      APIClient.instance = new APIClient()
    }
    return APIClient.instance
  }

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

  async callEdgeFunction<T>(functionName: string, payload: any = {}): Promise<T> {
    try {
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

  // Métodos específicos para cada funcionalidad
  async searchWithAI(query: string, parameters: any = {}) {
    return this.callEdgeFunction('ai-search-multi-provider', {
      search_query: query,
      search_parameters: parameters
    })
  }

  async parseContent(content: string, type: string = 'text') {
    return this.callEdgeFunction('parse-content', {
      content,
      fileType: type,
      source: 'clipboard'
    })
  }

  async validateConvocatoria(convocatoria: any) {
    return this.callEdgeFunction('validate-convocatoria', {
      convocatoria
    })
  }

  async enhancePreview(convocatoria: any) {
    return this.callEdgeFunction('enhance-preview', {
      convocatoria
    })
  }

  async getRecommendations(filters: any = {}) {
    return this.callEdgeFunction('get-recommendations', {
      filters
    })
  }

  async trackSuggestions(criteria: any) {
    return this.callEdgeFunction('track-suggestions', criteria)
  }

  async exportData(request: any) {
    return this.callEdgeFunction('export-data', request)
  }

  async manageSavedConvocatorias(action: string, data?: any) {
    return this.callEdgeFunction('manage-saved-convocatorias-fixed', {
      action,
      ...data
    })
  }

  async manageAIConfig(action: string, data?: any) {
    return this.callEdgeFunction('manage-ai-config-fixed', {
      action,
      ...data
    })
  }

  async getDashboardStats() {
    return this.callEdgeFunction('dashboard-stats-v2')
  }

  async managePushNotifications(action: string, data?: any) {
    return this.callEdgeFunction('push-notifications', {
      action,
      ...data
    })
  }
}

// Instancia singleton
export const apiClient = APIClient.getInstance()