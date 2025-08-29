import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Tests de integración para Edge Functions de ConvocatoriasPro
// Estos tests verifican la funcionalidad de las Edge Functions desplegadas

const SUPABASE_URL = 'https://wilvxlbiktetduwftqfn.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpbHZ4bGJpa3RldGR1d2Z0cWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNDUzMTksImV4cCI6MjA3MDgyMTMxOX0.eZ1iYIHdHVxQs2Osol0sZSCzTRcZZi91Iimc5OBnqXA'

// Configuración para tests de integración
const edgeFunctionUrl = (functionName: string) => 
  `${SUPABASE_URL}/functions/v1/${functionName}`

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY
}

// Utilidades para tests de integración
class EdgeFunctionTester {
  static async callFunction(functionName: string, payload: any = {}, options: any = {}) {
    const response = await fetch(edgeFunctionUrl(functionName), {
      method: 'POST',
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      body: JSON.stringify(payload)
    })

    const responseData = await response.json()
    
    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: response.headers
    }
  }

  static async testFunctionAvailability(functionName: string) {
    try {
      const response = await fetch(edgeFunctionUrl(functionName), {
        method: 'OPTIONS',
        headers: defaultHeaders
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}

describe('Edge Functions Integration Tests', () => {
  beforeAll(() => {
    console.log('🚀 Iniciando tests de integración de Edge Functions...')
  })

  afterAll(() => {
    console.log('✅ Tests de integración completados')
  })

  describe('Sistema de Alertas por Email', () => {
    it('should test email alert template generation', async () => {
      const payload = {
        action: 'test_templates'
      }

      const result = await EdgeFunctionTester.callFunction('send-email-alerts', payload)
      
      expect(result.status).toBe(200)
      expect(result.data.data).toBeDefined()
      expect(result.data.data.templates_tested).toBeGreaterThan(0)
      expect(result.data.data.templates).toBeInstanceOf(Array)
      
      // Verificar que se generaron templates para todos los tipos de alerta
      const templateTypes = result.data.data.templates.map(t => t.alert_type)
      expect(templateTypes).toContain('deadline_warning')
      expect(templateTypes).toContain('deadline_urgent')
      expect(templateTypes).toContain('weekly_digest')
    }, 15000)

    it('should handle manual email sending in test mode', async () => {
      const payload = {
        action: 'send_manual',
        testMode: true,
        manualEmail: {
          user_email: 'test@convocatoriaspro.cl',
          alert_type: 'deadline_warning',
          email_content: {
            convocatoria_name: 'Test Convocatoria',
            institucion: 'CORFO',
            fecha_cierre: '2025-12-31',
            days_until: 7
          }
        }
      }

      const result = await EdgeFunctionTester.callFunction('send-email-alerts', payload)
      
      expect(result.status).toBe(200)
      expect(result.data.data.sent).toBe(true)
      expect(result.data.data.messageId).toBeDefined()
      expect(result.data.data.recipient).toBe('test@convocatoriaspro.cl')
    }, 10000)

    it('should process pending alerts', async () => {
      const payload = {
        action: 'send_pending'
      }

      const result = await EdgeFunctionTester.callFunction('send-email-alerts', payload)
      
      expect(result.status).toBe(200)
      expect(result.data.data).toBeDefined()
      expect(result.data.data.processed).toBeDefined()
      expect(result.data.data.summary).toBeDefined()
    }, 20000)
  })

  describe('Sistema de Búsqueda con IA Optimizada', () => {
    it('should perform AI search with valid query', async () => {
      const payload = {
        search_query: 'innovación tecnológica',
        search_parameters: {
          area: 'tecnología',
          monto_min: 10000000
        },
        max_results: 3,
        include_metadata: true
      }

      const result = await EdgeFunctionTester.callFunction('ai-search-convocatorias-optimized', payload)
      
      expect(result.status).toBe(200)
      expect(result.data.data).toBeDefined()
      expect(result.data.data.search_id).toBeDefined()
      expect(result.data.data.results_count).toBeGreaterThanOrEqual(0)
      expect(result.data.data.results).toBeInstanceOf(Array)
      expect(result.data.data.processing_info).toBeDefined()
      expect(result.data.data.processing_info.ai_model_used).toBeDefined()
    }, 30000)

    it('should handle invalid search queries gracefully', async () => {
      const payload = {
        search_query: '', // Query vacía
        max_results: 5
      }

      const result = await EdgeFunctionTester.callFunction('ai-search-convocatorias-optimized', payload)
      
      expect(result.status).toBe(500)
      expect(result.data.error).toBeDefined()
      expect(result.data.error.code).toBe('AI_SEARCH_OPTIMIZED_ERROR')
    }, 10000)

    it('should limit results according to max_results parameter', async () => {
      const payload = {
        search_query: 'fondos de investigación',
        max_results: 2
      }

      const result = await EdgeFunctionTester.callFunction('ai-search-convocatorias-optimized', payload)
      
      if (result.status === 200) {
        expect(result.data.data.results.length).toBeLessThanOrEqual(2)
      }
    }, 25000)
  })

  describe('Sistema de Parsing Optimizado', () => {
    it('should parse text content successfully', async () => {
      const payload = {
        content: 'CORFO Convoca a Concurso de Innovación Digital 2025. Plazo de postulación: hasta el 31 de diciembre de 2025. Monto disponible: $100.000.000. Dirigido a empresas chilenas del sector tecnológico.',
        content_type: 'text',
        validate_output: true,
        include_metadata: true
      }

      const result = await EdgeFunctionTester.callFunction('parse-content-optimized', payload)
      
      expect(result.status).toBe(200)
      expect(result.data.data).toBeDefined()
      expect(result.data.data.parse_id).toBeDefined()
      expect(result.data.data.convocatorias).toBeInstanceOf(Array)
      expect(result.data.data.parsing_info).toBeDefined()
    }, 20000)

    it('should handle HTML content parsing', async () => {
      const payload = {
        content: `
          <html>
            <body>
              <h1>ANID - Convocatoria FONDECYT Regular 2025</h1>
              <p>Institución: Agencia Nacional de Investigación y Desarrollo</p>
              <p>Fecha de cierre: 15 de septiembre de 2025</p>
              <p>Monto: Hasta $80.000.000 por proyecto</p>
              <p>Área: Investigación científica y tecnológica</p>
            </body>
          </html>
        `,
        content_type: 'html',
        validate_output: true
      }

      const result = await EdgeFunctionTester.callFunction('parse-content-optimized', payload)
      
      expect(result.status).toBe(200)
      expect(result.data.data.convocatorias).toBeInstanceOf(Array)
      
      if (result.data.data.convocatorias.length > 0) {
        const convocatoria = result.data.data.convocatorias[0]
        expect(convocatoria.nombre_concurso).toBeDefined()
        expect(convocatoria.institucion).toBeDefined()
      }
    }, 25000)

    it('should reject content that is too long', async () => {
      const longContent = 'A'.repeat(60000) // 60k caracteres
      
      const payload = {
        content: longContent,
        content_type: 'text'
      }

      const result = await EdgeFunctionTester.callFunction('parse-content-optimized', payload)
      
      expect(result.status).toBe(500)
      expect(result.data.error).toBeDefined()
      expect(result.data.error.message).toContain('demasiado largo')
    }, 10000)
  })

  describe('Disponibilidad de Edge Functions', () => {
    const edgeFunctions = [
      'send-email-alerts',
      'email-alerts-cron-improved',
      'ai-search-convocatorias-optimized',
      'parse-content-optimized',
      'validate-convocatoria',
      'enhance-preview',
      'mp-webhook'
    ]

    edgeFunctions.forEach(functionName => {
      it(`should have ${functionName} function available`, async () => {
        const isAvailable = await EdgeFunctionTester.testFunctionAvailability(functionName)
        expect(isAvailable).toBe(true)
      }, 5000)
    })
  })

  describe('Error Handling y Robustez', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await fetch(edgeFunctionUrl('send-email-alerts'), {
        method: 'POST',
        headers: defaultHeaders,
        body: 'invalid json{'
      })

      expect(response.status).toBeGreaterThanOrEqual(400)
    }, 5000)

    it('should handle missing authorization headers', async () => {
      const response = await fetch(edgeFunctionUrl('parse-content-optimized'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Sin authorization header
        },
        body: JSON.stringify({
          content: 'test content',
          content_type: 'text'
        })
      })

      // Debe funcionar para contenido público o devolver error apropiado
      expect([200, 401, 403]).toContain(response.status)
    }, 5000)

    it('should handle CORS preflight requests', async () => {
      const response = await fetch(edgeFunctionUrl('ai-search-convocatorias-optimized'), {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://convocatorias-pro.cl',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    }, 5000)
  })
})