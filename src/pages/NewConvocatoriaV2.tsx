// Nueva página mejorada para crear convocatorias con IA integrada
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { aiService, ParseResult, ValidationResult, PreviewData } from '@/services/ai.service'
import { useAuth } from '@/hooks/useAuth'
import { Bot, FileText, CheckCircle, Eye, AlertCircle, Sparkles } from 'lucide-react'

// No necesitamos crear una nueva instancia, usamos la exportada
// const aiService = new AIAgentsService()

export default function NewConvocatoriaV2() {
  const { user, isPro } = useAuth()
  const [inputText, setInputText] = useState('')
  const [inputType, setInputType] = useState<'text' | 'file' | 'url'>('text')
  const [filename, setFilename] = useState('')
  
  // Estados para los resultados de los agentes
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [previewResult, setPreviewResult] = useState<PreviewData | null>(null)
  
  // Estados de carga
  const [isParsingLoading, setIsParsingLoading] = useState(false)
  const [isValidatingLoading, setIsValidatingLoading] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  
  // Estado de error general
  const [globalError, setGlobalError] = useState<string | null>(null)
  
  // Verificar si el usuario puede usar IA
  const canUseAI = isPro
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFilename(file.name)
      const reader = new FileReader()
      reader.onload = (e) => {
        setInputText(e.target?.result as string || '')
      }
      reader.readAsText(file)
    }
  }
  
  const handleParseContent = async () => {
    if (!inputText.trim()) {
      setGlobalError('Por favor, ingresa el contenido de la convocatoria')
      return
    }
    
    if (!canUseAI) {
      setGlobalError('Necesitas un plan Pro para usar las funciones de IA')
      return
    }
    
    setGlobalError(null)
    setIsParsingLoading(true)
    
    try {
      const result = await aiService.parseContent({
        type: inputType,
        content: inputText,
        filename: inputType === 'file' ? filename : undefined
      })
      
      setParseResult(result)
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Error al parsear el contenido')
    } finally {
      setIsParsingLoading(false)
    }
  }
  
  const handleValidateContent = async () => {
    if (!parseResult?.convocatorias?.[0]) {
      setGlobalError('Primero debes parsear el contenido para poder validarlo')
      return
    }
    
    setGlobalError(null)
    setIsValidatingLoading(true)
    
    try {
      const result = await aiService.validateConvocatoria(parseResult.convocatorias[0])
      setValidationResult(result)
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Error al validar el contenido')
    } finally {
      setIsValidatingLoading(false)
    }
  }
  
  const handlePreviewContent = async () => {
    if (!parseResult?.convocatorias?.[0]) {
      setGlobalError('Primero debes parsear el contenido para poder generar la vista previa')
      return
    }
    
    setGlobalError(null)
    setIsPreviewLoading(true)
    
    try {
      const result = await aiService.enhancePreview(parseResult.convocatorias[0])
      setPreviewResult(result)
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Error al generar vista previa')
    } finally {
      setIsPreviewLoading(false)
    }
  }
  
  const resetResults = () => {
    setParseResult(null)
    setValidationResult(null)
    setPreviewResult(null)
    setGlobalError(null)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nueva Convocatoria con IA
          </h1>
          <p className="text-gray-600">
            Utiliza nuestros agentes de IA para procesar y validar convocatorias de manera inteligente
          </p>
        </div>
        
        {/* Plan Warning */}
        {!canUseAI && (
          <Alert variant="warning" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <div>
              <h4 className="font-semibold">Plan requerido</h4>
              <p className="text-sm mt-1">
                Las funciones de IA están disponibles solo para usuarios Pro. 
                <a href="/plans" className="underline font-medium">Actualizar plan</a>
              </p>
            </div>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel izquierdo - Entrada de datos */}
          <div className="space-y-6">
            {/* Entrada de contenido */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Contenido de la Convocatoria
                </CardTitle>
                <CardDescription>
                  Pega el texto, sube un archivo o ingresa una URL de la convocatoria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selector de tipo de entrada */}
                <Tabs value={inputType} onValueChange={(value: any) => setInputType(value)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="text">Texto</TabsTrigger>
                    <TabsTrigger value="file">Archivo</TabsTrigger>
                    <TabsTrigger value="url">URL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="text">
                    <Textarea
                      placeholder="Pega aquí el contenido de la convocatoria..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="min-h-[200px]"
                    />
                  </TabsContent>
                  
                  <TabsContent value="file">
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept=".txt,.pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                      {filename && (
                        <p className="text-sm text-gray-500">Archivo seleccionado: {filename}</p>
                      )}
                      <Textarea
                        placeholder="El contenido del archivo aparecerá aquí..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="min-h-[150px]"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="url">
                    <div className="space-y-2">
                      <Input
                        type="url"
                        placeholder="https://ejemplo.com/convocatoria"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />
                      <p className="text-sm text-gray-500">
                        Ingresa la URL de la convocatoria para procesarla automáticamente
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
                
                {/* Botón para limpiar */}
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => { setInputText(''); setFilename(''); resetResults(); }}
                    disabled={!inputText}
                  >
                    Limpiar
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Botones de acción */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Agentes de IA
                </CardTitle>
                <CardDescription>
                  Procesa el contenido con nuestros agentes especializados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button 
                    onClick={handleParseContent}
                    disabled={!canUseAI || !inputText.trim() || isParsingLoading}
                    className="h-12 flex flex-col gap-1"
                  >
                    {isParsingLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    <span className="text-xs">Parsear</span>
                  </Button>
                  
                  <Button 
                    onClick={handleValidateContent}
                    disabled={!canUseAI || !parseResult || isValidatingLoading}
                    variant="outline"
                    className="h-12 flex flex-col gap-1"
                  >
                    {isValidatingLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span className="text-xs">Validar</span>
                  </Button>
                  
                  <Button 
                    onClick={handlePreviewContent}
                    disabled={!canUseAI || !parseResult || isPreviewLoading}
                    variant="secondary"
                    className="h-12 flex flex-col gap-1"
                  >
                    {isPreviewLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="text-xs">Vista Previa</span>
                  </Button>
                </div>
                
                {/* Error global */}
                {globalError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <div>
                      <h4 className="font-semibold">Error</h4>
                      <p className="text-sm mt-1">{globalError}</p>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Panel derecho - Resultados */}
          <div className="space-y-6">
            {/* Resultado del Parser */}
            {parseResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Resultado del Análisis
                    {parseResult.success ? (
                      <Badge variant="default" className="bg-green-600">
                        Éxito
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Error
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {parseResult.success && parseResult.convocatorias ? (
                    <div className="space-y-4">
                      {parseResult.convocatorias.map((conv, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <h4 className="font-semibold text-lg mb-2">{conv.nombre_concurso}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="font-medium">Institución:</span> {conv.institucion || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Estado:</span> 
                              <Badge variant={conv.estado === 'abierto' ? 'default' : 'secondary'} className="ml-2">
                                {conv.estado}
                              </Badge>
                            </div>
                            <div>
                              <span className="font-medium">Fecha cierre:</span> {conv.fecha_cierre}
                            </div>
                            <div>
                              <span className="font-medium">Área:</span> {conv.area || 'N/A'}
                            </div>
                            {conv.monto_financiamiento && (
                              <div className="sm:col-span-2">
                                <span className="font-medium">Financiamiento:</span> {conv.monto_financiamiento}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-red-600">
                      <h4 className="font-semibold mb-2">Errores encontrados:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {parseResult.errors?.map((error, index) => (
                          <li key={index} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Resultado de la Validación */}
            {validationResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Resultado de Validación
                    <Badge 
                      variant={validationResult.isValid ? 'default' : 'destructive'}
                      className={validationResult.isValid ? 'bg-green-600' : ''}
                    >
                      Score: {validationResult.score}/100
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {validationResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2">Errores:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {validationResult.warnings.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-yellow-600 mb-2">Advertencias:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-yellow-600">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {validationResult.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-600 mb-2">Sugerencias:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {validationResult.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm text-blue-600">{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Resultado de la Vista Previa */}
            {previewResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Vista Previa Mejorada
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Descripción mejorada */}
                    <div>
                      <h4 className="font-semibold mb-2">Descripción Mejorada:</h4>
                      <p className="text-sm bg-gray-50 p-3 rounded-lg">
                        {previewResult.enhanced_description}
                      </p>
                    </div>
                    
                    {/* Puntos clave */}
                    {previewResult.key_points.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Puntos Clave:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {previewResult.key_points.map((point, index) => (
                            <li key={index} className="text-sm">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Timeline */}
                    {previewResult.timeline.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Cronograma:</h4>
                        <div className="space-y-2">
                          {previewResult.timeline.map((event, index) => (
                            <div key={index} className="flex items-center gap-3 text-sm">
                              <Badge 
                                variant={event.importance === 'high' ? 'destructive' : event.importance === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {event.importance}
                              </Badge>
                              <span className="font-medium">{event.date}</span>
                              <span>{event.event}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Resumen de requisitos */}
                    {previewResult.requirements_summary.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Requisitos Principales:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {previewResult.requirements_summary.map((req, index) => (
                            <li key={index} className="text-sm">{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Competencia estimada */}
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">Competencia Estimada:</span>
                      <Badge 
                        variant={previewResult.estimated_competition === 'high' ? 'destructive' : 
                                previewResult.estimated_competition === 'medium' ? 'default' : 'secondary'}
                      >
                        {previewResult.estimated_competition === 'high' ? 'Alta' :
                         previewResult.estimated_competition === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}