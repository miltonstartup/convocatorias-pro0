import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Zap, 
  Brain, 
  Settings2, 
  Sparkles, 
  Target,
  CheckCircle,
  Clock,
  Crown,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export type AIProvider = 'openrouter' | 'gemini_direct' | 'gemini_smart'

export interface AIProviderConfig {
  provider: AIProvider
  model?: string
  temperature?: number
  max_tokens?: number
}

interface AIProviderSelectorToggleProps {
  selectedProvider: AIProvider
  selectedModel?: string
  onProviderChange: (config: AIProviderConfig) => void
  isProUser?: boolean
  disabled?: boolean
  className?: string
  defaultExpanded?: boolean
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

const PROVIDER_LABELS = {
  openrouter: 'OpenRouter - Múltiples Modelos',
  gemini_direct: 'Gemini 2.5 Pro Directo',
  gemini_smart: 'Flujo Inteligente Gemini 2.5 ✨'
}

const PROVIDER_DESCRIPTIONS = {
  openrouter: 'Múltiples modelos IA gratuitos con validación cruzada',
  gemini_direct: 'Procesamiento directo con Gemini 2.5 Pro',
  gemini_smart: 'Flujo optimizado: Flash-Lite 2.5 + Pro 2.5 para máxima precisión'
}

export default function AIProviderSelectorToggle({ 
  selectedProvider, 
  selectedModel,
  onProviderChange, 
  isProUser = false,
  disabled = false,
  className,
  defaultExpanded = false
}: AIProviderSelectorToggleProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
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

  const getCurrentProviderLabel = () => {
    const baseLabel = PROVIDER_LABELS[selectedProvider]
    if (selectedProvider === 'openrouter' && selectedModel) {
      const model = OPENROUTER_MODELS.find(m => m.id === selectedModel)
      return `${baseLabel} (${model?.name || 'Modelo personalizado'})`
    }
    return baseLabel
  }

  const getProviderIcon = () => {
    switch (selectedProvider) {
      case 'openrouter':
        return <Brain className="w-4 h-4 text-blue-500" />
      case 'gemini_direct':
        return <Sparkles className="w-4 h-4 text-blue-500" />
      case 'gemini_smart':
        return <Target className="w-4 h-4 text-green-500" />
      default:
        return <Brain className="w-4 h-4" />
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Botón de toggle compacto */}
      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {getProviderIcon()}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                Configuración IA
              </span>
              {isProUser && (
                <Crown className="w-3 h-3 text-primary flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {getCurrentProviderLabel()}
            </span>
            <span className="text-xs text-muted-foreground/70 truncate">
              {PROVIDER_DESCRIPTIONS[selectedProvider]}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <div className="flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                <ChevronUp className="w-3 h-3" />
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <ChevronDown className="w-3 h-3" />
              </div>
            )}
          </Button>
        </div>
      </div>
      
      {/* Panel expandible */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            key="expanded-panel"
            initial={{ opacity: 0, maxHeight: 0, marginTop: 0 }}
            animate={{ 
              opacity: 1, 
              maxHeight: 1000, // Suficiente para el contenido 
              marginTop: 8 // mt-2 equivale a 8px
            }}
            exit={{ 
              opacity: 0, 
              maxHeight: 0, 
              marginTop: 0,
              transition: { duration: 0.2, ease: 'easeInOut' }
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="w-4 h-4" />
                  Proveedor de IA
                </CardTitle>
                <CardDescription className="text-sm">
                  Elige cómo quieres que la IA procese tu búsqueda
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <RadioGroup 
                  value={selectedProvider} 
                  onValueChange={handleProviderChange}
                  disabled={disabled}
                  className="grid gap-3"
                >
                  {/* OpenRouter */}
                  <motion.div
                    className={cn(
                      "relative p-3 border rounded-lg transition-all cursor-pointer",
                      selectedProvider === 'openrouter' 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    )}
                    whileHover={{ scale: disabled ? 1 : 1.01 }}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem 
                        value="openrouter" 
                        id="openrouter" 
                        disabled={disabled}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="openrouter" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <Brain className="w-3 h-3" />
                          OpenRouter
                          <Badge variant="secondary" className="text-xs">Múltiples Modelos</Badge>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Múltiples modelos IA gratuitos con validación cruzada
                        </p>
                        
                        {selectedProvider === 'openrouter' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-2 border-t"
                          >
                            <Label className="text-xs font-medium mb-1 block">
                              Modelo:
                            </Label>
                            <Select 
                              value={openRouterModel} 
                              onValueChange={handleOpenRouterModelChange}
                              disabled={disabled}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPENROUTER_MODELS.map((model) => (
                                  <SelectItem key={model.id} value={model.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-xs">{model.name}</span>
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
                    className={cn(
                      "relative p-3 border rounded-lg transition-all cursor-pointer",
                      selectedProvider === 'gemini_direct' 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    )}
                    whileHover={{ scale: disabled ? 1 : 1.01 }}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem 
                        value="gemini_direct" 
                        id="gemini_direct" 
                        disabled={disabled}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="gemini_direct" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          Gemini 2.5 Pro Directo
                          <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                            2.5 Pro
                          </Badge>
                        </Label>
                        <p className="text-xs text-muted-foreground">
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
                    className={cn(
                      "relative p-3 border rounded-lg transition-all cursor-pointer",
                      selectedProvider === 'gemini_smart' 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    )}
                    whileHover={{ scale: disabled ? 1 : 1.01 }}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem 
                        value="gemini_smart" 
                        id="gemini_smart" 
                        disabled={disabled}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="gemini_smart" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <Target className="w-3 h-3 text-green-500" />
                          Flujo Inteligente Gemini 2.5
                          <Badge className="text-xs bg-gradient-to-r from-green-500 to-blue-500 text-white">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Recomendado
                          </Badge>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Procesamiento optimizado de 2 pasos: Flash-Lite 2.5 + Pro 2.5 para máxima precisión
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Gratis</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>Máxima precisión</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            <span>2-pasos optimizado</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </RadioGroup>
                
                {/* Información adicional */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Todos los proveedores están optimizados para convocatorias chilenas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>100% gratuito - No requiere claves API adicionales</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Cambio de proveedor en tiempo real durante búsquedas</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}