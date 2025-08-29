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
  ChevronUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type AIProvider = 'openrouter' | 'gemini_direct' | 'gemini_smart'

export interface AIProviderConfig {
  provider: AIProvider
  model?: string
  temperature?: number
  max_tokens?: number
}

interface AIProviderDropdownProps {
  selectedProvider: AIProvider
  selectedModel?: string
  onProviderChange: (config: AIProviderConfig) => void
  isProUser?: boolean
  disabled?: boolean
  className?: string
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

export default function AIProviderDropdown({ 
  selectedProvider, 
  selectedModel,
  onProviderChange, 
  isProUser = false,
  disabled = false,
  className 
}: AIProviderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
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

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
    >
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between h-auto py-3 px-4"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 text-left">
            <Settings2 className="w-4 h-4 flex-shrink-0" />
            <div className="flex flex-col items-start min-w-0">
              <span className="font-medium text-sm truncate max-w-full">
                Configuración IA
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-full">
                {getCurrentProviderLabel()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isProUser && (
              <Crown className="w-3 h-3 text-primary" />
            )}
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-4 h-4" />
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
                        Gemini 2.5 Pro
                        <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                          2.5 Pro
                        </Badge>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Procesamiento directo con Google Gemini 2.5 Pro
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-2 h-2" />
                          <span>Gratis</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2 h-2" />
                          <span>Rápido</span>
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
                          ✨ Recomendado
                        </Badge>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        2 pasos: Flash-Lite (2.5) + Pro (2.5) para máxima precisión
                      </p>
                      
                      <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 font-medium text-green-700 dark:text-green-300">
                            <Zap className="w-2 h-2" />
                            <span>Proceso de 2 Pasos:</span>
                          </div>
                          <div className="pl-3 space-y-0.5 text-green-600 dark:text-green-400">
                            <div>• Flash-Lite 2.5: Lista rápida</div>
                            <div>• Pro 2.5: Detalles completos</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-2 h-2" />
                          <span>Gratis</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-2 h-2" />
                          <span>Máxima precisión</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2 h-2" />
                          <span>~30s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </RadioGroup>

              {/* Pro Badge */}
              {isProUser && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded border border-primary/20">
                  <Crown className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Plan Pro</span>
                  <span className="text-xs text-muted-foreground">Acceso completo</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  )
}