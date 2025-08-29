import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Zap, 
  Brain, 
  Settings2, 
  Sparkles, 
  Target,
  CheckCircle,
  Clock,
  Crown
} from 'lucide-react'
import { motion } from 'framer-motion'

export type AIProvider = 'openrouter' | 'gemini_direct' | 'gemini_smart'

export interface AIProviderConfig {
  provider: AIProvider
  model?: string
  temperature?: number
  max_tokens?: number
}

interface AIProviderSelectorProps {
  selectedProvider: AIProvider
  selectedModel?: string
  onProviderChange: (config: AIProviderConfig) => void
  isProUser?: boolean
  disabled?: boolean
}

// Modelos OpenRouter gratuitos disponibles
const OPENROUTER_MODELS = [
  {
    id: 'deepseek/deepseek-chat-v3-0324:free',
    name: 'DeepSeek Chat v3',
    description: 'Eficiente para tareas estructuradas'
  },
  {
    id: 'google/gemini-2.0-flash-exp:free', 
    name: 'Gemini 2.0 Flash',
    description: 'Rápido y versátil'
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B',
    description: 'Potente para análisis complejos'
  }
]

export default function AIProviderSelector({ 
  selectedProvider, 
  selectedModel,
  onProviderChange, 
  isProUser = false,
  disabled = false 
}: AIProviderSelectorProps) {
  const [openRouterModel, setOpenRouterModel] = useState(selectedModel || OPENROUTER_MODELS[0].id)

  const handleProviderChange = (provider: AIProvider) => {
    const config: AIProviderConfig = {
      provider,
      ...(provider === 'openrouter' && { model: openRouterModel })
    }
    onProviderChange(config)
  }

  const handleOpenRouterModelChange = (model: string) => {
    setOpenRouterModel(model)
    if (selectedProvider === 'openrouter') {
      onProviderChange({
        provider: 'openrouter',
        model
      })
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Proveedor de IA
        </CardTitle>
        <CardDescription>
          Elige cómo quieres que la IA procese tu búsqueda
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <RadioGroup 
          value={selectedProvider} 
          onValueChange={handleProviderChange}
          disabled={disabled}
          className="grid gap-4"
        >
          {/* OpenRouter */}
          <motion.div
            className={`relative p-4 border rounded-lg transition-all ${
              selectedProvider === 'openrouter' 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50'
            }`}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem 
                value="openrouter" 
                id="openrouter" 
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="openrouter" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                  <Brain className="w-4 h-4" />
                  OpenRouter
                  <Badge variant="secondary" className="text-xs">Multiples Modelos</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Acceso a múltiples modelos IA gratuitos con validación cruzada
                </p>
                
                {selectedProvider === 'openrouter' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t"
                  >
                    <Label className="text-sm font-medium mb-2 block">
                      Selecciona Modelo:
                    </Label>
                    <Select 
                      value={openRouterModel} 
                      onValueChange={handleOpenRouterModelChange}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENROUTER_MODELS.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Gemini Directo */}
          <motion.div
            className={`relative p-4 border rounded-lg transition-all ${
              selectedProvider === 'gemini_direct' 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50'
            }`}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem 
                value="gemini_direct" 
                id="gemini_direct" 
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="gemini_direct" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Gemini 2.5 Pro Directo
                  <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                    2.5 Pro
                  </Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Procesamiento directo con el modelo más avanzado de Google Gemini 2.5
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Gratis</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Respuesta rápida</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Flujo Inteligente Gemini */}
          <motion.div
            className={`relative p-4 border rounded-lg transition-all ${
              selectedProvider === 'gemini_smart' 
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                : 'border-border hover:border-primary/50'
            }`}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem 
                value="gemini_smart" 
                id="gemini_smart" 
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="gemini_smart" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                  <Target className="w-4 h-4 text-green-500" />
                  Flujo Inteligente Gemini 2.5
                  <Badge className="text-xs bg-gradient-to-r from-green-500 to-blue-500 text-white">
                    ✨ Recomendado
                  </Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Procesamiento de 2 pasos: Flash-Lite (2.5) para listas + Pro (2.5) para detalles
                </p>
                
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
                      <Zap className="w-3 h-3" />
                      <span>Proceso Automático de 2 Pasos con Gemini 2.5:</span>
                    </div>
                    <div className="pl-5 space-y-1 text-green-600 dark:text-green-400">
                      <div>• Paso 1: Gemini 2.5 Flash-Lite genera lista rápida</div>
                      <div>• Paso 2: Gemini 2.5 Pro procesa detalles completos</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Gratis</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>Máxima precisión</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>~30-45 seg</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </RadioGroup>

        {/* Pro Badge */}
        {isProUser && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Plan Pro Activo</span>
            <span className="text-xs text-muted-foreground">Acceso completo a todos los proveedores IA</span>
          </div>
        )}

        {/* Info sobre el proveedor seleccionado */}
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            {selectedProvider === 'openrouter' && (
              <>
                <div>• Multiples modelos con validación cruzada</div>
                <div>• Resultados más diversos y robustos</div>
                <div>• Configuración flexible de modelos</div>
              </>
            )}
            {selectedProvider === 'gemini_direct' && (
              <>
                <div>• Respuesta directa de Gemini 2.5 Pro</div>
                <div>• Procesamiento rápido y eficiente</div>
                <div>• Ideal para consultas específicas</div>
              </>
            )}
            {selectedProvider === 'gemini_smart' && (
              <>
                <div>• Combina la velocidad de Flash-Lite 2.5 con la precisión de Pro 2.5</div>
                <div>• Proceso optimizado para convocatorias</div>
                <div>• Mayor detalle y relevancia en resultados</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
