import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileUp, Sparkles, CheckCircle, AlertCircle, Eye } from 'lucide-react'
import { useAI } from '@/hooks/useAI'
import { useConvocatorias } from '@/hooks/useConvocatorias'
import { ParseResult } from '@/services/ai'
import { ConvocatoriaPreviewCard } from '@/components/convocatorias/ConvocatoriaPreviewCard'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

export function ConvocatoriaImportPage() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  
  const { isProcessing, parseFile, validateConvocatoria, enhancePreview } = useAI()
  const { createConvocatoria } = useConvocatorias()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFile(files[0])
    }
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      await processFile(files[0])
    }
  }, [])

  const processFile = async (file: File) => {
    try {
      const result = await parseFile(file)
      if (result?.success) {
        setParseResult(result)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Error processing file:', error)
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
          fuente: convocatoria.fuente || 'Importación IA'
        }
        
        await createConvocatoria(convocatoriaData)
      } catch (error) {
        console.error('Error importing convocatoria:', error)
      }
    }
    
    // Limpiar estados
    setParseResult(null)
    setShowPreview(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Importar desde Archivo</h1>
        <p className="text-muted-foreground">
          Sube archivos .xlsx, .csv o .txt y deja que la IA extraiga la información
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
              <FileUp className="h-5 w-5" />
              Importación Inteligente con IA
            </CardTitle>
            <CardDescription>
              Arrastra archivos aquí o haz clic para seleccionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">
                {isDragOver ? 'Suelta el archivo aquí' : 'Arrastra archivos aquí'}
              </p>
              <p className="text-muted-foreground mb-4">
                o
              </p>
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" disabled={isProcessing}>
                  {isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.csv,.txt,.pdf"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
              </label>
            </div>
            
            {isProcessing && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Procesando con IA...</span>
                </div>
                <Progress value={undefined} className="w-full" />
              </div>
            )}

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Formatos soportados:</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">.xlsx</Badge>
                <Badge variant="secondary">.csv</Badge>
                <Badge variant="secondary">.txt</Badge>
                <Badge variant="secondary">.pdf</Badge>
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
                Vista Previa de Importación
              </CardTitle>
              <CardDescription>
                Se encontraron {parseResult?.convocatorias?.length || 0} convocatorias
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
                    Cancelar
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