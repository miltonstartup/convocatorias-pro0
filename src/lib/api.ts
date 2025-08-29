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
    
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json'
    }
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    
    return headers
  }

  async callEdgeFunction<T>(functionName: string, payload: any = {}): Promise<T> {
    try {
      console.log(`🚀 Calling Edge Function: ${functionName}`)
      console.log(`📤 Payload:`, JSON.stringify(payload, null, 2))
      
      const authHeaders = await this.getAuthHeaders()
      
      // Let supabase.functions.invoke handle the JSON stringification
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload, // Don't stringify here - let Supabase handle it
        headers: authHeaders
      })

      if (error) {
        console.error(`❌ Error en Edge Function ${functionName}:`, error)
        console.error(`📋 Error details:`, JSON.stringify(error, null, 2))
        throw new Error(`Error en ${functionName}: ${error.message || JSON.stringify(error)}`)
      }

      console.log(`✅ Success calling ${functionName}`)
      console.log(`📥 Response:`, data)
      
      return data
    } catch (error) {
      console.error(`💥 Error al llamar a ${functionName}:`, error)
      throw error
    }
  }

  // Alternative method with manual fetch for debugging
  async callEdgeFunctionDirect<T>(functionName: string, payload: any = {}): Promise<T> {
    try {
      console.log(`🔧 Direct call to Edge Function: ${functionName}`)
      console.log(`📤 Payload:`, JSON.stringify(payload, null, 2))
      
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: { [key: string]: string } = {
        'Content-Type': 'application/json'
      }
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      
      const supabaseUrl = supabase.supabaseUrl
      const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`
      
      console.log(`🌐 Calling URL: ${functionUrl}`)
      console.log(`🔑 Headers:`, headers)
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      console.log(`📊 Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ HTTP Error: ${response.status}`)
        console.error(`📝 Error body:`, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log(`✅ Success direct call to ${functionName}`)
      console.log(`📥 Response:`, data)
      
      return data
    } catch (error) {
      console.error(`💥 Error in direct call to ${functionName}:`, error)
      throw error
    }
  }

  // Métodos específicos para cada funcionalidad
  async searchWithAI(query: string, parameters: any = {}) {
    // Validate query before sending
    if (!query || query.trim().length === 0) {
      throw new Error('Query de búsqueda no puede estar vacía')
    }

    const payload = {
      search_query: query.trim(),
      search_parameters: parameters
    }

    console.log('🔍 searchWithAI called with:', payload)

    try {
      return await this.callEdgeFunction('ai-search-multi-provider', payload)
    } catch (error) {
      console.error('❌ Error in searchWithAI, trying direct method:', error)
      // Fallback to direct method if regular method fails
      return await this.callEdgeFunctionDirect('ai-search-multi-provider', payload)
    }
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