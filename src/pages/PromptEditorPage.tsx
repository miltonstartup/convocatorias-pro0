import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Edit3, 
  Save, 
  RotateCcw, 
  Eye, 
  Info, 
  CheckCircle,
  AlertTriangle,
  Settings,
  Sparkles,
  Brain,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface PromptData {
  title: string
  description: string
  default_prompt: string
  current_prompt: string
  is_custom: boolean
  char_count: number
  last_modified?: string
}

interface PromptsData {
  [key: string]: PromptData
}

interface PreviewData {
  prompt_type: string
  char_count: number
  word_count: number
  variables_found: string[]
  example_with_query: string
  estimated_tokens: number
  quality_score: number
}

export default function PromptEditorPage() {
  const { user, isPro } = useAuth()
  const [prompts, setPrompts] = useState<PromptsData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [tempPrompt, setTempPrompt] = useState('')
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [activeTab, setActiveTab] = useState('openrouter')
  const [hasChanges, setHasChanges] = useState(false)

  // Cargar prompts del usuario
  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase.functions.invoke('manage-custom-prompts', {
        body: { action: 'get' }
      })

      if (error) {
        throw new Error(error.message || 'Error al cargar prompts')
      }

      setPrompts(data.data.prompts)
      console.log('✅ Prompts cargados:', data.data.prompts)

    } catch (error) {
      console.error('❌ Error cargando prompts:', error)
      toast.error('No se pudieron cargar los prompts personalizados')
    } finally {
      setIsLoading(false)
    }
  }

  const startEditing = (promptType: string) => {
    setEditingPrompt(promptType)
    setTempPrompt(prompts[promptType]?.current_prompt || '')
    setHasChanges(false)
  }

  const cancelEditing = () => {
    setEditingPrompt(null)
    setTempPrompt('')
    setPreviewData(null)
    setHasChanges(false)
  }

  const savePrompt = async (promptType: string) => {
    if (!tempPrompt.trim()) {
      toast.error('El prompt no puede estar vacío')
      return
    }

    try {
      setIsSaving(true)
      
      const { data, error } = await supabase.functions.invoke('manage-custom-prompts', {
        body: {
          action: 'save',
          prompt_type: promptType,
          custom_prompt: tempPrompt
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al guardar prompt')
      }

      // Actualizar estado local
      setPrompts(prev => ({
        ...prev,
        [promptType]: {
          ...prev[promptType],
          current_prompt: tempPrompt,
          is_custom: true,
          char_count: tempPrompt.length,
          last_modified: new Date().toISOString()
        }
      }))

      setEditingPrompt(null)
      setTempPrompt('')
      setHasChanges(false)
      
      toast.success('Prompt personalizado guardado exitosamente')

    } catch (error) {
      console.error('❌ Error guardando prompt:', error)
      toast.error('No se pudo guardar el prompt personalizado')
    } finally {
      setIsSaving(false)
    }
  }

  const resetPrompt = async (promptType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-custom-prompts', {
        body: {
          action: 'reset',
          prompt_type: promptType
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al restablecer prompt')
      }

      // Obtener el prompt por defecto antes de actualizar el estado
      const defaultPrompt = prompts[promptType]?.default_prompt || ''
      
      // Actualizar estado local
      setPrompts(prev => ({
        ...prev,
        [promptType]: {
          ...prev[promptType],
          current_prompt: defaultPrompt,
          is_custom: false,
          char_count: defaultPrompt.length,
          last_modified: null
        }
      }))

      // Si está editando este prompt, actualizar el valor temporal
      if (editingPrompt === promptType) {
        setTempPrompt(defaultPrompt)
        setHasChanges(false)
      }
      
      toast.success('Prompt restablecido a configuración por defecto')

    } catch (error) {
      console.error('❌ Error restableciendo prompt:', error)
      toast.error('No se pudo restablecer el prompt')
    }
  }

  const previewPrompt = async (promptType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-custom-prompts', {
        body: {
          action: 'preview',
          prompt_type: promptType,
          custom_prompt: tempPrompt
        }
      })

      if (error) {
        throw new Error(error.message || 'Error en vista previa')
      }

      setPreviewData(data.data.preview)

    } catch (error) {
      console.error('❌ Error en vista previa:', error)
      toast.error('No se pudo generar vista previa')
    }
  }

  const handlePromptChange = (value: string) => {
    setTempPrompt(value)
    setHasChanges(value !== prompts[editingPrompt!]?.current_prompt)
  }

  const getPromptIcon = (promptType: string) => {
    switch (promptType) {
      case 'openrouter':
        return <Brain className="w-5 h-5 text-green-600" />
      case 'gemini_flash':
        return <Zap className="w-5 h-5 text-yellow-600" />
      case 'gemini_pro':
        return <Sparkles className="w-5 h-5 text-blue-600" />
      default:
        return <Edit3 className="w-5 h-5 text-gray-600" />
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
        <span className="ml-2 text-muted-foreground">Cargando editor de prompts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Edit3 className="w-8 h-8 text-primary" />
            Editor de Prompts
          </h1>
          <p className="text-muted-foreground mt-2">
            Personaliza los prompts utilizados por los diferentes proveedores de IA
          </p>
        </div>
      </div>

      {/* Plan Pro Badge */}
      {isPro && (
        <Alert className="border-primary/20 bg-primary/5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            <strong>Plan Pro Activo:</strong> Tienes acceso completo al editor de prompts personalizados
          </AlertDescription>
        </Alert>
      )}

      {/* Información sobre variables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Variables Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <Badge variant="outline">[CONSULTA_USUARIO]</Badge>
              <p className="text-muted-foreground">La consulta ingresada por el usuario</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">[LISTA_PASO_1]</Badge>
              <p className="text-muted-foreground">Resultados del primer paso (flujo inteligente)</p>
            </div>
            <div className="space-y-2">
              <Badge variant="outline">[UBICACION_DETECTADA]</Badge>
              <p className="text-muted-foreground">Ubicación geográfica detectada automáticamente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor de Prompts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="openrouter" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            OpenRouter
          </TabsTrigger>
          <TabsTrigger value="gemini_flash" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Gemini Flash
          </TabsTrigger>
          <TabsTrigger value="gemini_pro" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Gemini Pro
          </TabsTrigger>
        </TabsList>

        {Object.entries(prompts).map(([promptType, promptData]) => (
          <TabsContent key={promptType} value={promptType} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getPromptIcon(promptType)}
                    <div>
                      <CardTitle>{promptData.title}</CardTitle>
                      <CardDescription>{promptData.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {promptData.is_custom && (
                      <Badge variant="secondary">Personalizado</Badge>
                    )}
                    <Badge variant="outline">
                      {promptData.char_count} caracteres
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {editingPrompt === promptType ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`prompt-${promptType}`}>Prompt Personalizado</Label>
                      <Textarea
                        id={`prompt-${promptType}`}
                        value={tempPrompt}
                        onChange={(e) => handlePromptChange(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                        placeholder="Ingresa tu prompt personalizado..."
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{tempPrompt.length} caracteres</span>
                        <span>{Math.ceil(tempPrompt.length / 4)} tokens estimados</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => savePrompt(promptType)}
                        disabled={isSaving || !hasChanges || !tempPrompt.trim()}
                        className="gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Guardando...' : 'Guardar'}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => previewPrompt(promptType)}
                        disabled={!tempPrompt.trim()}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Vista Previa
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        onClick={cancelEditing}
                        className="gap-2"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {promptData.current_prompt}
                      </pre>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => startEditing(promptType)}
                        className="gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar Prompt
                      </Button>
                      
                      {promptData.is_custom && (
                        <Button 
                          variant="outline" 
                          onClick={() => resetPrompt(promptType)}
                          className="gap-2"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restablecer
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Vista Previa */}
                {previewData && editingPrompt === promptType && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border rounded-lg p-4 bg-muted/30"
                  >
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Vista Previa
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Caracteres:</span>
                        <div className="font-medium">{previewData.char_count}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Palabras:</span>
                        <div className="font-medium">{previewData.word_count}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tokens:</span>
                        <div className="font-medium">{previewData.estimated_tokens}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Calidad:</span>
                        <div className={`font-medium ${getQualityColor(previewData.quality_score)}`}>
                          {previewData.quality_score}%
                        </div>
                      </div>
                    </div>
                    
                    {previewData.variables_found.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm text-muted-foreground">Variables encontradas:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {previewData.variables_found.map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-sm text-muted-foreground">Ejemplo con consulta:</span>
                      <div className="bg-background rounded p-2 mt-1 text-xs font-mono">
                        {previewData.example_with_query}
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}