// Página mejorada para crear convocatorias con integración IA
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileUp, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Brain,
  FileText,
  Link as LinkIcon,
  Wand2,
  Calendar,
  Building2,
  DollarSign,
  ArrowLeft,
  Crown
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useConvocatorias } from '@/hooks/useConvocatorias'
import { useAI } from '@/hooks/useAI'
import { usePlans } from '@/hooks/usePlans'
import { ConvocatoriaForm } from '@/types'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const convocatoriaSchema = z.object({
  nombre_concurso: z.string().min(5, 'El nombre debe tener al menos 5 caracteres'),
  institucion: z.string().min(2, 'La institución debe tener al menos 2 caracteres'),
  fecha_cierre: z.string().min(1, 'La fecha de cierre es obligatoria'),
  fecha_apertura: z.string().optional(),
  fecha_resultados: z.string().optional(),
  estado: z.enum(['abierto', 'cerrado', 'en_evaluacion', 'finalizado']),
  tipo_fondo: z.string().optional(),
  area: z.string().optional(),
  monto_financiamiento: z.string().optional(),
  requisitos: z.string().optional(),
  fuente: z.string().optional(),
  notas_usuario: z.string().optional()
})

type ConvocatoriaFormData = z.infer<typeof convocatoriaSchema>

export function ConvocatoriaNewPageIA() {
  const navigate = useNavigate()
  const { createConvocatoria } = useConvocatorias()
  const { parseContent, validateConvocatoria, enhancePreview, isProcessing, canUseAI } = useAI()
  const { hasReachedLimit, isProPlan, isTrialActive } = usePlans()
  
  const [aiInput, setAiInput] = useState('')
  const [aiInputType, setAiInputType] = useState<'text' | 'url'>('text')
  const [parsedData, setParsedData] = useState<any[]>([])
  const [currentConvocatoria, setCurrentConvocatoria] = useState<any>(null)
  const [enhancedPreview, setEnhancedPreview] = useState<any>(null)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<ConvocatoriaFormData>({
    resolver: zodResolver(convocatoriaSchema),
    defaultValues: {
      estado: 'abierto'
    }
  })

  const watchedValues = watch()
  const canCreate = isProPlan() || isTrialActive() || !hasReachedLimit(0)

  // Verificar límite de convocatorias
  if (!canCreate) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-6xl mb-4">🚨</div>
            <h2 className="text-2xl font-bold mb-2">Límite Alcanzado</h2>
            <p className="text-muted-foreground mb-6">
              Has alcanzado el límite de convocatorias para tu plan actual.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/plans')}>
                <Crown className="w-4 h-4 mr-2" />
                Ver Planes Pro
              </Button>
              <Button variant="outline" onClick={() => navigate('/app/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleAIParse = async () => {
    if (!aiInput.trim()) {
      toast.error('Por favor ingresa contenido para procesar')
      return
    }

    const result = await parseContent({
      type: aiInputType,
      content: aiInput.trim()
    })

    if (result?.success && result.convocatorias) {
      setParsedData(result.convocatorias)
      
      // Si solo hay una convocatoria, cargarla automáticamente
      if (result.convocatorias.length === 1) {
        loadConvocatoriaData(result.convocatorias[0])
      }
    }
  }

  const loadConvocatoriaData = (convocatoria: any) => {
    setCurrentConvocatoria(convocatoria)
    
    // Cargar datos en el formulario
    Object.keys(convocatoria).forEach(key => {
      if (convocatoria[key] && key in watchedValues) {
        setValue(key as keyof ConvocatoriaFormData, convocatoria[key])
      }
    })

    toast.success('✨ Datos cargados en el formulario')
  }

  const handleValidation = async () => {
    const dataToValidate = currentConvocatoria || watchedValues
    if (!dataToValidate.nombre_concurso) {
      toast.error('Por favor completa al menos el nombre de la convocatoria')
      return
    }

    const result = await validateConvocatoria(dataToValidate)
    if (result) {
      setValidationResults(result)
    }
  }

  const handleEnhancePreview = async () => {
    const dataToEnhance = currentConvocatoria || watchedValues
    if (!dataToEnhance.nombre_concurso) {
      toast.error('Por favor completa al menos el nombre de la convocatoria')
      return
    }

    const result = await enhancePreview(dataToEnhance)
    if (result) {
      setEnhancedPreview(result)
    }
  }

  const onSubmit = async (data: ConvocatoriaFormData) => {
    try {
      setIsSubmitting(true)
      await createConvocatoria(data)
      toast.success('Convocatoria creada exitosamente')
      navigate('/app/dashboard')
    } catch (error: any) {
      toast.error('Error al crear convocatoria', {
        description: error.message
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Convocatoria</h1>
          <p className="text-muted-foreground mt-2">
            {canUseAI 
              ? 'Usa IA para extraer información automáticamente o ingresa manualmente'
              : 'Completa la información de tu nueva convocatoria'
            }
          </p>
        </div>
      </div>

      <Tabs defaultValue={canUseAI ? 'ai' : 'manual'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          {canUseAI && (
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Extracción con IA
              <Crown className="w-3 h-3 text-primary" />
            </TabsTrigger>
          )}
          <TabsTrigger value="manual" className="gap-2">
            <FileText className="w-4 h-4" />
            Ingreso Manual
          </TabsTrigger>
        </TabsList>

        {/* Tab de IA */}
        {canUseAI && (
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Extracción Inteligente
                  <Badge variant="secondary" className="ml-auto">
                    <Crown className="w-3 h-3 mr-1" />
                    Pro
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Pega el texto de la convocatoria o proporciona una URL para que la IA extraiga la información automáticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={aiInputType === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiInputType('text')}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Texto
                  </Button>
                  <Button
                    variant={aiInputType === 'url' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAiInputType('url')}
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    URL
                  </Button>
                </div>

                <Textarea
                  placeholder={
                    aiInputType === 'text' 
                      ? 'Pega aquí el texto completo de la convocatoria...'
                      : 'Ingresa la URL de la convocatoria...'
                  }
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  rows={6}
                  className="resize-none"
                />

                <Button
                  onClick={handleAIParse}
                  disabled={isProcessing || !aiInput.trim()}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Procesando con IA...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Extraer Información
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Resultados de parsing */}
            {parsedData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>✨ Convocatorias Encontradas</CardTitle>
                  <CardDescription>
                    La IA encontró {parsedData.length} convocatoria(s). Selecciona una para cargar sus datos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {parsedData.map((conv, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => loadConvocatoriaData(conv)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{conv.nombre_concurso}</h4>
                            {conv.institucion && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Building2 className="w-3 h-3" />
                                {conv.institucion}
                              </p>
                            )}
                            {conv.fecha_cierre && (
                              <div className="flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                <span className="text-xs text-muted-foreground">
                                  Cierre: {conv.fecha_cierre}
                                </span>
                              </div>
                            )}
                            {conv.monto_financiamiento && (
                              <div className="flex items-center gap-1 mt-1">
                                <DollarSign className="w-3 h-3" />
                                <span className="text-xs text-muted-foreground">
                                  {conv.monto_financiamiento}
                                </span>
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm">
                            Seleccionar
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Tab Manual */}
        <TabsContent value="manual">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
                <CardDescription>
                  Datos principales de la convocatoria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="nombre_concurso">Nombre de la Convocatoria *</Label>
                    <Input
                      id="nombre_concurso"
                      {...register('nombre_concurso')}
                      placeholder="Ej: Fondo de Desarrollo de Startups 2025"
                    />
                    {errors.nombre_concurso && (
                      <p className="text-sm text-destructive mt-1">{errors.nombre_concurso.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="institucion">Institución *</Label>
                    <Input
                      id="institucion"
                      {...register('institucion')}
                      placeholder="Ej: CORFO, SERCOTEC, Ministerio de Cultura"
                    />
                    {errors.institucion && (
                      <p className="text-sm text-destructive mt-1">{errors.institucion.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="tipo_fondo">Tipo de Fondo</Label>
                    <Input
                      id="tipo_fondo"
                      {...register('tipo_fondo')}
                      placeholder="Ej: Emprendimiento, Investigación, Cultura"
                    />
                  </div>

                  <div>
                    <Label htmlFor="area">Área</Label>
                    <Input
                      id="area"
                      {...register('area')}
                      placeholder="Ej: Tecnología, Salud, Educación"
                    />
                  </div>

                  <div>
                    <Label htmlFor="monto_financiamiento">Monto de Financiamiento</Label>
                    <Input
                      id="monto_financiamiento"
                      {...register('monto_financiamiento')}
                      placeholder="Ej: $10.000.000 CLP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fecha_apertura">Fecha de Apertura</Label>
                    <Input
                      id="fecha_apertura"
                      type="date"
                      {...register('fecha_apertura')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_cierre">Fecha de Cierre *</Label>
                    <Input
                      id="fecha_cierre"
                      type="date"
                      {...register('fecha_cierre')}
                    />
                    {errors.fecha_cierre && (
                      <p className="text-sm text-destructive mt-1">{errors.fecha_cierre.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="fecha_resultados">Fecha de Resultados</Label>
                    <Input
                      id="fecha_resultados"
                      type="date"
                      {...register('fecha_resultados')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Select onValueChange={(value) => setValue('estado', value as any)} defaultValue="abierto">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abierto">Abierto</SelectItem>
                        <SelectItem value="cerrado">Cerrado</SelectItem>
                        <SelectItem value="en_evaluacion">En Evaluación</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fuente">Fuente/URL</Label>
                    <Input
                      id="fuente"
                      {...register('fuente')}
                      placeholder="https://ejemplo.com/convocatoria"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="requisitos">Requisitos</Label>
                  <Textarea
                    id="requisitos"
                    {...register('requisitos')}
                    placeholder="Describe los requisitos principales para postular..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notas_usuario">Notas Personales</Label>
                  <Textarea
                    id="notas_usuario"
                    {...register('notas_usuario')}
                    placeholder="Tus notas o comentarios sobre esta convocatoria..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Funciones de IA para formulario manual */}
            {canUseAI && watchedValues.nombre_concurso && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Funciones de IA
                    <Badge variant="secondary">
                      <Crown className="w-3 h-3 mr-1" />
                      Pro
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Mejora tu convocatoria con inteligencia artificial
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleValidation}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Validar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleEnhancePreview}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      Enriquecer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resultados de validación */}
            {validationResults && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {validationResults.isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                    )}
                    Resultados de Validación
                  </CardTitle>
                  <CardDescription>
                    Score: {validationResults.score}/100
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {validationResults.errors?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-destructive mb-2">Errores:</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {validationResults.errors.map((error: string, index: number) => (
                          <li key={index} className="text-sm text-destructive">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {validationResults.warnings?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-orange-600 mb-2">Advertencias:</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {validationResults.warnings.map((warning: string, index: number) => (
                          <li key={index} className="text-sm text-orange-600">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {validationResults.suggestions?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2">Sugerencias:</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {validationResults.suggestions.map((suggestion: string, index: number) => (
                          <li key={index} className="text-sm text-blue-600">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vista previa enriquecida */}
            {enhancedPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Vista Previa Enriquecida
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Descripción Mejorada:</h4>
                    <p className="text-sm text-muted-foreground">{enhancedPreview.enhanced_description}</p>
                  </div>
                  
                  {enhancedPreview.key_points?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Puntos Clave:</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        {enhancedPreview.key_points.map((point: string, index: number) => (
                          <li key={index} className="text-sm">{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Competencia Estimada:</span>
                    <Badge 
                      variant={
                        enhancedPreview.estimated_competition === 'high' ? 'destructive' :
                        enhancedPreview.estimated_competition === 'medium' ? 'secondary' : 'default'
                      }
                    >
                      {enhancedPreview.estimated_competition === 'high' ? 'Alta' :
                       enhancedPreview.estimated_competition === 'medium' ? 'Media' : 'Baja'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botón de envío */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/app/dashboard')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Creando...
                  </>
                ) : (
                  'Crear Convocatoria'
                )}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  )
}
