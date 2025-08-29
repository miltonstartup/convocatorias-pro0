import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCcw,
  Zap,
  Brain,
  Crown,
  Sparkles,
  Target,
  Globe
} from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useGeminiSearch } from '@/hooks/useGeminiSearch'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { toast } from 'sonner'

interface AIModel {
  id: string
  name: string
  description: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
  owned_by: string
  enabled?: boolean
}

interface GeminiModel {
  id: string
  name: string
  description: string
  maxTokens: number
  inputCost: string
  outputCost: string
  contextWindow: number
  optimal_for: string[]
  enabled?: boolean
}

interface ModelConfig {
  user_id: string
  model_name: string
  enabled: boolean
}

export default function AIConfigPage() {
  const { user, isPro } = useAuth()
  const { getAvailableModels: getGeminiModels, usageInfo } = useGeminiSearch()
  const [models, setModels] = useState<AIModel[]>([])
  const [geminiModels, setGeminiModels] = useState<GeminiModel[]>([])
  const [userConfigs, setUserConfigs] = useState<ModelConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState('openrouter')

  // Cargar modelos disponibles y configuración del usuario
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Cargar modelos GRATUITOS disponibles desde OpenRouter
      const { data: modelsData, error: modelsError } = await supabase.functions.invoke('get-available-models')
      
      if (modelsError) {
        console.error('Error al cargar modelos gratuitos:', modelsError)
        setError('No se pudieron cargar los modelos gratuitos disponibles. Verifica la configuración de la API.')
        return
      }

      if (!modelsData?.data?.models) {
        setError('No se recibieron modelos gratuitos válidos de la API.')
        return
      }

      const availableModels = modelsData.data.models
      setModels(availableModels)
      
      // Cargar modelos de Gemini
      const geminiModelsData = getGeminiModels()
      setGeminiModels(geminiModelsData.map(model => ({
        ...model,
        enabled: true // Gemini está disponible por defecto
      })))

      // Cargar configuración del usuario usando manage-ai-config-fixed (consistente)
      const { data: configsData, error: configsError } = await supabase.functions.invoke('manage-ai-config-fixed', {
        method: 'GET'
      })

      let configs = []
      if (configsError) {
        console.warn('No se pudo cargar configuración previa:', configsError)
        // No es crítico si no hay configuración previa
      } else if (configsData?.data?.configs) {
        configs = configsData.data.configs
      }

      setUserConfigs(configs)

      // Marcar modelos habilitados según la configuración del usuario
      const modelsWithConfig = availableModels.map((model: AIModel) => {
        const userConfig = configs.find((config: ModelConfig) => config.model_name === model.id)
        return {
          ...model,
          enabled: userConfig?.enabled || false
        }
      })

      setModels(modelsWithConfig)

      // Si no hay configuración previa, habilitar los 2-3 mejores modelos gratuitos por defecto
      if (configs.length === 0 && availableModels.length > 0) {
        const defaultEnabledCount = Math.min(3, availableModels.length)
        const updatedModels = modelsWithConfig.map((model, index) => ({
          ...model,
          enabled: index < defaultEnabledCount
        }))
        setModels(updatedModels)
        setHasChanges(true)
      }

    } catch (err) {
      console.error('Error al cargar datos:', err)
      setError('Error al cargar la configuración. Inténtalo de nuevo.')
      // Asegurar que los arrays estén inicializados aunque haya error
      setModels([])
      setGeminiModels([])
      setUserConfigs([])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleModel = (modelId: string) => {
    // Validación adicional para asegurar que models sea un array
    if (!Array.isArray(models) || models.length === 0) {
      toast({
        title: "Error",
        description: "No hay modelos disponibles para configurar.",
        variant: "destructive"
      })
      return
    }
    
    setModels(prev => {
      const updated = prev.map(model => 
        model.id === modelId ? { ...model, enabled: !model.enabled } : model
      )
      
      // Verificar que al menos un modelo esté habilitado
      const enabledCount = updated.filter(m => m.enabled).length
      if (enabledCount === 0) {
        toast({
          title: "Error",
          description: "Debe haber al menos un modelo habilitado.",
          variant: "destructive"
        })
        return prev
      }
      
      setHasChanges(true)
      return updated
    })
  }

  const saveConfiguration = async () => {
    if (!user) return

    // Validación adicional de datos antes de guardar
    if (!Array.isArray(models) || models.length === 0) {
      setError('No hay modelos configurados para guardar.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      // Usar la Edge Function manage-ai-config-fixed para guardar configuración
      const { data: saveData, error: saveError } = await supabase.functions.invoke('manage-ai-config-fixed', {
        body: {
          models: models
        }
      })

      if (saveError) {
        throw saveError
      }

      setHasChanges(false)
      toast({
        title: "Configuración guardada",
        description: "Los modelos de IA han sido configurados correctamente.",
      })

    } catch (err) {
      console.error('Error al guardar configuración:', err)
      setError('Error al guardar la configuración. Inténtalo de nuevo.')
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    setModels(prev => prev.map((model, index) => ({
      ...model,
      enabled: index === 0 // Solo el primer modelo habilitado
    })))
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Cargando configuración de IA...</span>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              Configuración IA Multi-Proveedor
            </h1>
            <p className="text-muted-foreground mt-2">
              Configura los modelos de inteligencia artificial: OpenRouter, Gemini Direct y Flujo Inteligente
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={resetToDefaults}
              disabled={isSaving}
              className="gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Restablecer
            </Button>
            
            <Button
              onClick={saveConfiguration}
              disabled={!hasChanges || isSaving}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </div>

        {/* Plan Pro Badge */}
        {isPro && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-medium text-primary">Plan Pro Activo</span>
            <span className="text-sm text-muted-foreground">Acceso completo a todas las funciones de IA</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs para diferentes proveedores */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="openrouter" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              OpenRouter
            </TabsTrigger>
            <TabsTrigger value="gemini" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gemini
            </TabsTrigger>
            <TabsTrigger value="smart-flow" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Flujo Inteligente
            </TabsTrigger>
          </TabsList>

          {/* OpenRouter Tab */}
          <TabsContent value="openrouter" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Modelos OpenRouter Gratuitos
                </CardTitle>
                <CardDescription>
                  Configura qué modelos usar para validación cruzada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!Array.isArray(models) || models.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-center">
                    <div className="space-y-3">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        No hay modelos de OpenRouter disponibles.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadData}
                        disabled={isLoading}
                      >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Reintentar
                      </Button>
                    </div>
                  </div>
                ) : (
                  models.map((model) => (
                  <motion.div
                    key={model.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-sm">{model.name}</h3>
                        <Badge variant="secondary">Gratuito</Badge>
                        {model.enabled && <Badge className="bg-green-100 text-green-800">Activo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Contexto: {(model.context_length || 0).toLocaleString()}</span>
                        <span>Por: {model.owned_by}</span>
                      </div>
                    </div>
                    <Switch
                      checked={model.enabled || false}
                      onCheckedChange={() => toggleModel(model.id)}
                      disabled={isSaving}
                    />
                  </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gemini Tab */}
          <TabsContent value="gemini" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  Modelos Gemini 2.5
                </CardTitle>
                <CardDescription>
                  Modelos de Google para búsqueda directa y procesamiento avanzado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!Array.isArray(geminiModels) || geminiModels.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-center">
                    <div className="space-y-3">
                      <Sparkles className="w-8 h-8 text-blue-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Cargando modelos de Gemini...
                      </p>
                    </div>
                  </div>
                ) : (
                  geminiModels.map((model) => (
                  <motion.div
                    key={model.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50 border-blue-200"
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-sm">{model.name}</h3>
                        <Badge className="bg-blue-100 text-blue-800">Google</Badge>
                        <Badge variant="outline">Gratuito</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Tokens: {(model.maxTokens || 0).toLocaleString()}</span>
                        <span>Contexto: {(model.contextWindow || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(model.optimal_for || []).map((use) => (
                          <Badge key={use} variant="outline" className="text-xs">
                            {use}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-600">Disponible</span>
                    </div>
                  </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Smart Flow Tab */}
          <TabsContent value="smart-flow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  Flujo Inteligente Gemini
                  <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                    ✨ Recomendado
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Procesamiento optimizado de 2 pasos para máxima precisión
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Paso 1 */}
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="w-4 h-4 text-green-500" />
                        Paso 1: Lista Rápida
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-sm">Gemini 2.5 Flash-Lite</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Genera una lista rápida de posibles programas y oportunidades de financiamiento.
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>• Respuesta en ~5-10 segundos</div>
                        <div>• Enfoque en nombres y organizaciones</div>
                        <div>• Base para análisis detallado</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Paso 2 */}
                  <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="w-4 h-4 text-blue-500" />
                        Paso 2: Análisis Completo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-sm">Gemini 2.5 Pro</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Procesa la lista inicial para generar información detallada y verificable.
                      </p>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>• Análisis detallado en ~20-30 segundos</div>
                        <div>• Información completa y estructurada</div>
                        <div>• Validación y verificación de datos</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    Ventajas del Flujo Inteligente
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Máxima precisión</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Resultados más relevantes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Información estructurada</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Proceso automático</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Totalmente gratuito</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Optimizado para Chile</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Plan Pro Badge */}
        {isPro && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Plan Pro Activo</span>
            <span className="text-xs text-muted-foreground">Acceso completo a todos los proveedores IA</span>
          </div>
        )}

        {/* Información sobre configuración */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información de Configuración</CardTitle>
            <CardDescription>
              Todos los proveedores están disponibles y optimizados para convocatorias chilenas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">OpenRouter:</p>
                  <p className="text-muted-foreground">Múltiples modelos gratuitos con validación cruzada</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Gemini Direct:</p>
                  <p className="text-muted-foreground">Acceso directo a Gemini 2.5 Pro para respuestas rápidas</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Flujo Inteligente:</p>
                  <p className="text-muted-foreground">Proceso optimizado de 2 pasos para máxima precisión</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enlace al Editor de Prompts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Personalización Avanzada
            </CardTitle>
            <CardDescription>
              Configura y personaliza los prompts utilizados por cada proveedor de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Editor de Prompts</h4>
                  <p className="text-sm text-muted-foreground">
                    Personaliza los prompts para OpenRouter, Gemini Flash-Lite y Gemini Pro
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/app/prompt-editor'}
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                Abrir Editor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}