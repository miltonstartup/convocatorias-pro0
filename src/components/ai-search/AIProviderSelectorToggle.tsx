import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Sparkles, 
  Target, 
  Globe,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings
} from 'lucide-react'

export type AIProvider = 'openrouter' | 'gemini' | 'smart_flow' | 'google_pse_raw'

interface AIProviderSelectorToggleProps {
  selectedProvider: AIProvider
  onProviderChange: (provider: AIProvider) => void
  selectedModel: string
  onModelChange: (model: string) => void
  className?: string
}

const AI_PROVIDERS = [
  {
    id: 'openrouter' as AIProvider,
    name: 'OpenRouter',
    description: 'Múltiples modelos con validación cruzada',
    icon: Brain,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    features: ['DeepSeek Chat v3', 'Gemini 2.0 Flash', 'Llama 3.3 70B', 'Validación cruzada'],
    speed: 'Medio (15-25s)',
    accuracy: 'Alta',
    models: [
      { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek Chat v3' },
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash' },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B' }
    ]
  },
  {
    id: 'gemini' as AIProvider,
    name: 'Gemini Directo',
    description: 'Acceso directo a Gemini 2.5 Pro',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    features: ['Gemini 2.5 Pro', 'Respuesta rápida', 'Alta precisión', 'Contexto extenso'],
    speed: 'Rápido (8-15s)',
    accuracy: 'Muy Alta',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
    ]
  },
  {
    id: 'smart_flow' as AIProvider,
    name: 'Flujo Inteligente',
    description: 'Proceso optimizado de 2 pasos',
    icon: Target,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    features: ['Paso 1: Flash-Lite (lista)', 'Paso 2: Pro (análisis)', 'Máxima precisión', 'Resultados optimizados'],
    speed: 'Lento (25-40s)',
    accuracy: 'Máxima',
    recommended: true,
    models: [
      { id: 'auto', name: 'Automático (Flash-Lite + Pro)' }
    ]
  },
  {
    id: 'google_pse_raw' as AIProvider,
    name: 'Google PSE (Desarrollo)',
    description: 'Resultados crudos de Google PSE para verificación',
    icon: Globe,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    features: ['Búsqueda web real', 'Sin procesamiento IA', 'Resultados verificables', 'Modo desarrollo'],
    speed: 'Muy Rápido (3-8s)',
    accuracy: 'Datos Crudos',
    development: true,
    models: [
      { id: 'raw', name: 'Resultados Crudos' }
    ]
  }
]

export function AIProviderSelectorToggle({ 
  selectedProvider, 
  onProviderChange, 
  selectedModel, 
  onModelChange,
  className 
}: AIProviderSelectorToggleProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const currentProvider = AI_PROVIDERS.find(p => p.id === selectedProvider)
  const availableModels = currentProvider?.models || []

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Proveedor de IA
          </CardTitle>
          <CardDescription>
            Selecciona el proveedor y modelo para la búsqueda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de Proveedor */}
          <RadioGroup value={selectedProvider} onValueChange={onProviderChange}>
            <div className="space-y-3">
              {AI_PROVIDERS.map((provider) => {
                const Icon = provider.icon
                const isSelected = selectedProvider === provider.id
                
                return (
                  <div key={provider.id} className="relative">
                    <Label
                      htmlFor={provider.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                        isSelected 
                          ? `${provider.borderColor} ${provider.bgColor}` 
                          : 'border-gray-200'
                      }`}
                    >
                      <RadioGroupItem value={provider.id} id={provider.id} className="mt-1" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-5 w-5 ${provider.color}`} />
                          <span className="font-semibold text-gray-900">{provider.name}</span>
                          
                          {provider.recommended && (
                            <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs">
                              ✨ Recomendado
                            </Badge>
                          )}
                          
                          {provider.development && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                              🛠️ Desarrollo
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{provider.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Velocidad:</span>
                            <span className="ml-1 font-medium">{provider.speed}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Precisión:</span>
                            <span className="ml-1 font-medium">{provider.accuracy}</span>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-900">Características:</h4>
                              <div className="grid grid-cols-1 gap-1">
                                {provider.features.map((feature, index) => (
                                  <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span>{feature}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Label>
                  </div>
                )
              })}
            </div>
          </RadioGroup>

          {/* Selector de Modelo */}
          {availableModels.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modelo Específico:</Label>
              <RadioGroup value={selectedModel} onValueChange={onModelChange}>
                <div className="space-y-2">
                  {availableModels.map((model) => (
                    <Label
                      key={model.id}
                      htmlFor={model.id}
                      className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-gray-50"
                    >
                      <RadioGroupItem value={model.id} id={model.id} />
                      <span className="text-sm">{model.name}</span>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Información adicional para Google PSE */}
          {selectedProvider === 'google_pse_raw' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Modo Desarrollo:</strong> Esta opción devuelve resultados crudos de Google Programmable Search Engine 
                sin procesamiento IA. Úsala para verificar que la búsqueda web esté funcionando correctamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Información del flujo inteligente */}
          {selectedProvider === 'smart_flow' && (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                <strong>Flujo Inteligente:</strong> Proceso de 2 pasos optimizado para máxima precisión.
                Paso 1: Gemini Flash-Lite genera lista rápida. Paso 2: Gemini Pro analiza en detalle.
              </AlertDescription>
            </Alert>
          )}

          {/* Botón para mostrar/ocultar detalles */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full"
          >
            {showDetails ? 'Ocultar Detalles' : 'Ver Detalles Técnicos'}
          </Button>

          {/* Detalles técnicos */}
          {showDetails && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg text-xs">
              <div>
                <h4 className="font-semibold mb-2">Configuración Técnica:</h4>
                <div className="space-y-1 text-gray-600">
                  <div>• Proveedor seleccionado: {currentProvider?.name}</div>
                  <div>• Modelo activo: {selectedModel}</div>
                  <div>• Tiempo estimado: {currentProvider?.speed}</div>
                  <div>• Precisión esperada: {currentProvider?.accuracy}</div>
                </div>
              </div>
              
              {selectedProvider === 'google_pse_raw' && (
                <div>
                  <h4 className="font-semibold mb-2">Google PSE Config:</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>• Search Engine ID: 87c6c106f57d44d11</div>
                    <div>• Resultados máximos: 10</div>
                    <div>• Idioma: Español (Chile)</div>
                    <div>• Filtros de seguridad: Activos</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}