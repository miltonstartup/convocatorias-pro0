import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchResult } from '@/hooks/useAISearchReal'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Clock, 
  DollarSign, 
  Building, 
  Tag,
  AlertTriangle,
  Shield,
  BookmarkPlus,
  Download,
  FileText,
  FileSpreadsheet
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResultsFixedProps {
  results: SearchResult[]
  searchId?: string
  isSearching?: boolean
  onApprove: (resultIds: string[], addToCalendar?: boolean) => Promise<boolean>
  onReject: (resultIds: string[]) => Promise<boolean>
}

export function SearchResultsFixed({ 
  results, 
  searchId, 
  isSearching,
  onApprove,
  onReject 
}: SearchResultsFixedProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStates, setProcessingStates] = useState<Record<string, boolean>>({})

  // Manejar estado de procesamiento individual
  const setResultProcessing = (resultId: string, processing: boolean) => {
    setProcessingStates(prev => ({
      ...prev,
      [resultId]: processing
    }))
  }

  const handleApproveOne = async (resultId: string, addToCalendar = false) => {
    console.log('🟢 Iniciando aprobación individual:', { resultId, addToCalendar })
    setResultProcessing(resultId, true)
    
    try {
      const success = await onApprove([resultId], addToCalendar)
      if (success) {
        console.log('✅ Aprobación individual exitosa')
        toast.success('Convocatoria aprobada exitosamente')
      } else {
        console.error('❌ Aprobación individual falló')
        toast.error('Error al aprobar convocatoria')
      }
    } catch (error) {
      console.error('❌ Error en aprobación individual:', error)
      toast.error('Error al aprobar convocatoria')
    } finally {
      setResultProcessing(resultId, false)
    }
  }

  const handleRejectOne = async (resultId: string) => {
    console.log('🟡 Iniciando rechazo individual:', { resultId })
    setResultProcessing(resultId, true)
    
    try {
      const success = await onReject([resultId])
      if (success) {
        console.log('✅ Rechazo individual exitoso')
        toast.success('Convocatoria descartada')
      } else {
        console.error('❌ Rechazo individual falló')
        toast.error('Error al descartar convocatoria')
      }
    } catch (error) {
      console.error('❌ Error en rechazo individual:', error)
      toast.error('Error al descartar convocatoria')
    } finally {
      setResultProcessing(resultId, false)
    }
  }

  const handleSaveConvocatoria = async (result: SearchResult) => {
    console.log('💾 Guardando convocatoria:', { id: result.id, title: result.title })
    setResultProcessing(result.id, true)
    
    try {
      const { data, error } = await supabase.functions.invoke('manage-saved-convocatorias-fixed', {
        body: {
          action: 'save_convocatoria',
          title: result.title,
          description: result.description,
          organization: result.validated_data?.organization || '',
          amount: result.amount,
          deadline: result.deadline,
          requirements: result.requirements,
          source_url: result.source_url,
          category: result.validated_data?.category || 'General',
          tags: result.validated_data?.tags || [],
          from_ai_search: true,
          ai_search_id: searchId
        }
      })

      if (error) {
        throw new Error(error.message || 'Error al guardar convocatoria')
      }

      if (data?.data?.already_saved) {
        toast.info('Esta convocatoria ya está guardada', {
          description: 'Puedes revisarla en la sección "Convocatorias Guardadas"'
        })
      } else {
        toast.success('Convocatoria guardada exitosamente', {
          description: 'Puedes revisarla en "Convocatorias Guardadas"'
        })
      }

      console.log('✅ Convocatoria guardada:', data?.data)

    } catch (error) {
      console.error('❌ Error guardando convocatoria:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar'
      toast.error('Error al guardar convocatoria', { description: errorMessage })
    } finally {
      setResultProcessing(result.id, false)
    }
  }

  const handleExportResults = async (format: 'txt' | 'excel' | 'pdf') => {
    console.log('📄 Exportando resultados en formato:', format)
    setIsProcessing(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('export-search-results', {
        body: {
          results: results,
          format: format,
          search_metadata: {
            search_id: searchId,
            search_date: new Date().toISOString(),
            results_count: results.length,
            export_format: format
          }
        }
      })

      if (error) {
        throw new Error(error.message || `Error exportando en formato ${format.toUpperCase()}`)
      }

      // Crear y descargar archivo desde contenido
      const blob = format === 'pdf' 
        ? new Blob([data], { type: 'text/html' })
        : format === 'excel'
        ? new Blob([data], { type: 'text/csv' })
        : new Blob([data], { type: 'text/plain;charset=utf-8' })
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      if (format === 'pdf') {
        // Para PDF, abrir en nueva ventana para permitir impresión/guardado como PDF
        const newWindow = window.open(url, '_blank')
        if (newWindow) {
          newWindow.document.title = `Convocatorias_${new Date().getTime()}.pdf`
        }
        toast.success('Documento PDF abierto para impresión', {
          description: `Use Ctrl+P para imprimir/guardar como PDF. ${results.length} convocatorias incluidas`
        })
      } else {
        // Para TXT y CSV, descarga directa
        link.download = `convocatorias_${new Date().getTime()}.${format === 'excel' ? 'csv' : format}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        toast.success(`Archivo ${format.toUpperCase()} descargado exitosamente`, {
          description: `${results.length} convocatorias exportadas`
        })
      }
      
      URL.revokeObjectURL(url)
      
      console.log('✅ Exportación completada:', { format, resultsCount: results.length })
      
    } catch (error) {
      console.error('❌ Error en exportación:', error)
      const errorMessage = error instanceof Error ? error.message : `Error exportando ${format.toUpperCase()}`
      toast.error('Error en exportación', { description: errorMessage })
    } finally {
      setIsProcessing(false)
    }
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getReliabilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (results.length === 0 && !isSearching) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-muted-foreground">
            <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
            <p>No se encontraron convocatorias que coincidan con tu búsqueda.</p>
            <p className="text-sm mt-2">Intenta ajustar los parámetros de búsqueda.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Resultados de Búsqueda IA
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Shield className="w-3 h-3 mr-1" />
              {results.length} verificada{results.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          
          {/* Botones de Exportación Globales */}
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">Exportar todas:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportResults('txt')}
                disabled={isProcessing}
                className="min-w-0 flex-shrink-0"
              >
                <FileText className="mr-1 h-3 w-3" />
                TXT
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportResults('excel')}
                disabled={isProcessing}
                className="min-w-0 flex-shrink-0"
              >
                <FileSpreadsheet className="mr-1 h-3 w-3" />
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportResults('pdf')}
                disabled={isProcessing}
                className="min-w-0 flex-shrink-0"
              >
                <Download className="mr-1 h-3 w-3" />
                PDF
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {results.map((result) => {
          const daysUntilDeadline = result.deadline ? getDaysUntilDeadline(result.deadline) : null
          const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 30
          const isExpired = daysUntilDeadline !== null && daysUntilDeadline < 0
          const reliabilityScore = result.validated_data?.reliability_score || 95
          const isProcessingResult = processingStates[result.id] || false
          
          return (
            <Card key={result.id} className={cn(
              "border-l-4 transition-all",
              result.approved_by_user === true && "border-l-green-500 bg-green-50",
              result.approved_by_user === false && "border-l-red-500 bg-red-50",
              result.approved_by_user === null && "border-l-blue-500",
              isExpired && "opacity-60"
            )}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        {result.title}
                      </h3>
                      
                      {result.validated_data?.organization && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <Building className="h-3 w-3" />
                          {result.validated_data.organization}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {reliabilityScore > 0 && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getReliabilityColor(reliabilityScore))}
                        >
                          <Shield className="w-3 h-3 mr-1" />
                          IA: {reliabilityScore}%
                        </Badge>
                      )}
                      
                      {result.validated_data?.status && (
                        <Badge variant={result.validated_data.status === 'Abierta' ? 'default' : 'secondary'}>
                          {result.validated_data.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Descripción */}
                  {result.description && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.description}
                    </p>
                  )}
                  
                  {/* Información clave */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    {result.amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">{result.amount}</span>
                      </div>
                    )}
                    
                    {result.deadline && (
                      <div className={cn(
                        "flex items-center gap-2",
                        isUrgent && "text-orange-600",
                        isExpired && "text-red-600"
                      )}>
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {new Date(result.deadline).toLocaleDateString()}
                          {daysUntilDeadline !== null && (
                            <span className="ml-1 text-xs">
                              ({daysUntilDeadline > 0 ? `${daysUntilDeadline} días` : 'Vencida'})
                            </span>
                          )}
                        </span>
                        {isUrgent && !isExpired && (
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        )}
                      </div>
                    )}
                    
                    {result.validated_data?.category && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-blue-600" />
                        <span>{result.validated_data.category}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {result.validated_data?.tags && result.validated_data.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.validated_data.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Requisitos */}
                  {result.requirements && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="font-semibold text-sm text-gray-900 mb-1">Requisitos:</h4>
                      <p className="text-sm text-gray-700">{result.requirements}</p>
                    </div>
                  )}
                  
                  {/* Enlace fuente */}
                  {result.source_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <ExternalLink className="h-3 w-3 text-blue-600" />
                      <a 
                        href={result.source_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline truncate"
                      >
                        Ver convocatoria original
                      </a>
                    </div>
                  )}
                  
                  {/* Estado de aprobación */}
                  {result.approved_by_user !== null && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm font-medium",
                      result.approved_by_user ? "text-green-700" : "text-red-700"
                    )}>
                      {result.approved_by_user ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      {result.approved_by_user ? 'Aprobada' : 'Descartada'}
                      {result.approved_by_user && result.approved_at && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({new Date(result.approved_at).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* BOTONES DE ACCIÓN INDIVIDUALES - IMPLEMENTACIÓN CORREGIDA */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {/* Botón Guardar */}
                      <Button
                        size="sm"
                        onClick={() => handleSaveConvocatoria(result)}
                        disabled={isProcessingResult}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none min-w-[100px]"
                      >
                        <BookmarkPlus className="mr-1 h-3 w-3" />
                        {isProcessingResult ? 'Guardando...' : 'Guardar'}
                      </Button>
                      
                      {/* Botón Aprobar */}
                      <Button
                        size="sm"
                        onClick={() => handleApproveOne(result.id, false)}
                        disabled={isProcessingResult}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none min-w-[100px]"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {isProcessingResult ? 'Procesando...' : 'Aprobar'}
                      </Button>
                      
                      {/* Botón Aprobar + Calendario */}
                      <Button
                        size="sm"
                        onClick={() => handleApproveOne(result.id, true)}
                        disabled={isProcessingResult}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none min-w-[120px]"
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        {isProcessingResult ? 'Procesando...' : 'Aprobar + Calendario'}
                      </Button>
                      
                      {/* Botón Descartar */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectOne(result.id)}
                        disabled={isProcessingResult}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 flex-1 sm:flex-none min-w-[100px]"
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        {isProcessingResult ? 'Procesando...' : 'Descartar'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </CardContent>
    </Card>
  )
}