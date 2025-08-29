import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clipboard, Sparkles, CheckCircle, AlertCircle, Eye, Copy } from 'lucide-react'
import { useAI } from '@/hooks/useAI'
import { useConvocatorias } from '@/hooks/useConvocatorias'
import { ParseResult } from '@/services/ai'
import { ConvocatoriaPreviewCard } from '@/components/convocatorias/ConvocatoriaPreviewCard'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export function ConvocatoriaPastePage() {
  const [clipboardContent, setClipboardContent] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { isProcessing, parseClipboard, validateConvocatoria, enhancePreview } = useAI()
  const { createConvocatoria } = useConvocatorias()

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setClipboardContent(text)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    } catch (error) {
      console.error('Error reading clipboard:', error)
      // Fallback: focus textarea for manual paste
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }

  const handleDetectConvocatorias = async () => {
    if (!clipboardContent.trim()) {
      return
    }

    try {
      const result = await parseClipboard(clipboardContent)
      if (result?.success) {
        setParseResult(result)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Error parsing clipboard:', error)
    }
  }

  const handleImportConvocatorias = async () => {
    if (!parseResult?.convocatorias) return

    for (const convocatoria of parseResult.convocatorias) {
      try {
        // Validar y mejorar cada convocatoria antes de guardar
        const validation = await validateConvocatoria(convocatoria)
        const enhanced = await enhancePreview(convocatoria)
        
        // Convertir el formato de la IA al formato de la base de datos
        const convocatoriaData = {
          nombre_concurso: convocatoria.nombre_concurso,
          institucion: convocatoria.institucion || '',
          fecha_cierre: convocatoria.fecha_cierre,
          fecha_apertura: convocatoria.fecha_apertura,
          fecha_resultados: convocatoria.fecha_resultados,
          estado: convocatoria.estado,
          tipo_fondo: convocatoria.tipo_fondo,
          area: convocatoria.area,
          monto_financiamiento: convocatoria.monto_financiamiento,
          requisitos: convocatoria.requisitos,
          descripcion: enhanced ? enhanced.enhanced_description : convocatoria.descripcion,
          contacto: convocatoria.contacto,
          sitio_web: convocatoria.sitio_web,
          fuente: convocatoria.fuente || 'Detección IA'
        }
        
        await createConvocatoria(convocatoriaData)
      } catch (error) {
        console.error('Error importing convocatoria:', error)
      }
    }
    
    // Limpiar estados
    setParseResult(null)
    setShowPreview(false)
    setClipboardContent('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Pegar y Detectar con IA</h1>
        <p className="text-muted-foreground">
          Pega texto de cualquier fuente y deja que la IA extraiga las convocatorias
        </p>
        <Badge variant="outline" className="mt-2">
          <Sparkles className="mr-1 h-3 w-3" />
          Funcionalidad con IA
        </Badge>
      </div>

      {!showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clipboard className="h-5 w-5" />
              Detección Inteligente de Convocatorias
            </CardTitle>
            <CardDescription>
              Pega contenido de páginas web, documentos o correos electrónicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button 
                  variant="outline" 
                  onClick={handlePasteFromClipboard}
                  disabled={isProcessing}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Pegar desde Portapapeles
                </Button>
              </div>

              <Textarea
                ref={textareaRef}
                placeholder="Pega aquí el contenido desde páginas web, documentos PDF, correos electrónicos, etc.\n\nPor ejemplo:\n- Lista de convocatorias desde sitios de CORFO, SERCOTEC\n- Texto copiado desde PDFs de fondos\n- Contenido de correos con información de concursos\n- Publicaciones de redes sociales sobre financiamiento"
                className="min-h-[200px] resize-y"
                value={clipboardContent}
                onChange={(e) => setClipboardContent(e.target.value)}
                disabled={isProcessing}
              />

              <div className="flex gap-2">
                <Button 
                  onClick={handleDetectConvocatorias}
                  disabled={!clipboardContent.trim() || isProcessing}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isProcessing ? 'Analizando...' : 'Detectar Convocatorias'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setClipboardContent('')}
                  disabled={isProcessing}
                >
                  Limpiar
                </Button>
              </div>
            </div>
            
            {isProcessing && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analizando contenido con IA...</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Fuentes compatibles:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>&bull; Sitios web de CORFO</div>
                <div>&bull; Páginas de SERCOTEC</div>
                <div>&bull; Fondos de Cultura</div>
                <div>&bull; Correos institucionales</div>
                <div>&bull; Documentos PDF</div>
                <div>&bull; Redes sociales</div>
                <div>&bull; Convocatorias internacionales</div>
                <div>&bull; Boletines informativos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa de Detección
              </CardTitle>
              <CardDescription>
                Se detectaron {parseResult?.convocatorias?.length || 0} convocatorias en el contenido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Confianza:</span>
                      <Badge variant={parseResult.confidence > 80 ? 'default' : parseResult.confidence > 60 ? 'secondary' : 'destructive'}>
                        {Math.round(parseResult.confidence)}%
                      </Badge>
                    </div>
                    <Progress value={parseResult.confidence} className="w-full" />
                  </div>
                </div>

                {parseResult.warnings && parseResult.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Advertencias:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {parseResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4">
                  {parseResult.convocatorias?.map((convocatoria, index) => (
                    <ConvocatoriaPreviewCard
                      key={index}
                      convocatoria={convocatoria}
                      onEdit={(edited) => {
                        if (parseResult.convocatorias) {
                          const newConvocatorias = [...parseResult.convocatorias]
                          newConvocatorias[index] = edited
                          setParseResult({
                            ...parseResult,
                            convocatorias: newConvocatorias
                          })
                        }
                      }}
                    />
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleImportConvocatorias} disabled={isProcessing}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Importar {parseResult?.convocatorias?.length || 0} convocatorias
                  </Button>
                  <Button variant="outline" onClick={() => setShowPreview(false)}>
                    Volver a editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}