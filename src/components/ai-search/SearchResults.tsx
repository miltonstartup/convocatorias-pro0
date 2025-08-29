import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useAISearchReal, SearchResult } from '@/hooks/useAISearchReal'
import { useSavedConvocatorias } from '@/hooks/useSavedConvocatorias'
import { useExportResults } from '@/hooks/useExportResults'
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
  Brain,
  Zap,
  Shield,
  BookmarkPlus,
  FileText,
  FileSpreadsheet,
  File
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResultsProps {
  results: SearchResult[]
  searchId?: string
  isSearching?: boolean
}

export function SearchResults({ results, searchId, isSearching }: SearchResultsProps) {
  const { approveResults, rejectResults } = useAISearchReal()
  const { saveConvocatoria } = useSavedConvocatorias()
  const { exportResultsLocal, isExporting } = useExportResults()
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectResult = (resultId: string, checked: boolean) => {
    console.log('🔘 Selección individual:', { resultId, checked, currentSelection: selectedResults })
    setSelectedResults(prev => {
      if (checked) {
        // Solo añadir si no está ya seleccionado
        return prev.includes(resultId) ? prev : [...prev, resultId]
      } else {
        // Solo remover si está seleccionado
        return prev.filter(id => id !== resultId)
      }
    })
  }

  const handleSelectAll = (checked: boolean) => {
    console.log('🔘 Selección múltiple:', { checked, resultsCount: results.length })
    if (checked) {
      // Seleccionar todos los IDs disponibles
      const allIds = results.map(r => r.id)
      setSelectedResults(allIds)
    } else {
      // Deseleccionar todos
      setSelectedResults([])
    }
  }

  const handleApproveSelected = async (addToCalendar = false) => {
    if (selectedResults.length === 0) {
      console.warn('⚠️ No hay resultados seleccionados para aprobar')
      return
    }
    
    console.log('🟢 Iniciando aprobación masiva:', { selectedResults, addToCalendar })
    setIsProcessing(true)
    
    try {
      const success = await approveResults(selectedResults, addToCalendar)
      
      if (success) {
        console.log('✅ Aprobación masiva exitosa')
        setSelectedResults([])
      } else {
        console.error('❌ Aprobación masiva falló')
      }
    } catch (error) {
      console.error('❌ Error en aprobación masiva:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectSelected = async () => {
    if (selectedResults.length === 0) {
      console.warn('⚠️ No hay resultados seleccionados para rechazar')
      return
    }
    
    console.log('🟡 Iniciando rechazo masivo:', { selectedResults })
    setIsProcessing(true)
    
    try {
      const success = await rejectResults(selectedResults)
      
      if (success) {
        console.log('✅ Rechazo masivo exitoso')
        setSelectedResults([])
      } else {
        console.error('❌ Rechazo masivo falló')
      }
    } catch (error) {
      console.error('❌ Error en rechazo masivo:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApproveOne = async (resultId: string, addToCalendar = false) => {
    console.log('🟢 Iniciando aprobación individual:', { resultId, addToCalendar })
    setIsProcessing(true)
    
    try {
      const success = await approveResults([resultId], addToCalendar)
      if (success) {
        console.log('✅ Aprobación individual exitosa')
      } else {
        console.error('❌ Aprobación individual falló')
      }
    } catch (error) {
      console.error('❌ Error en aprobación individual:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectOne = async (resultId: string) => {
    console.log('🟡 Iniciando rechazo individual:', { resultId })
    setIsProcessing(true)
    
    try {
      const success = await rejectResults([resultId])
      if (success) {
        console.log('✅ Rechazo individual exitoso')
      } else {
        console.error('❌ Rechazo individual falló')
      }
    } catch (error) {
      console.error('❌ Error en rechazo individual:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveOne = async (result: SearchResult) => {
    console.log('💾 Guardando convocatoria individual:', result.title)
    
    const convocatoriaData = {
      ai_search_result_id: result.id,
      title: result.title,
      description: result.description,
      organization: result.validated_data?.organization,
      deadline: result.deadline,
      amount: result.amount,
      requirements: result.requirements,
      source_url: result.source_url,
      tags: result.validated_data?.tags || []
    }
    
    const success = await saveConvocatoria(convocatoriaData)
    if (success) {
      console.log('✅ Convocatoria guardada exitosamente')
    }
  }

  const handleExportResults = async (format: 'txt' | 'excel' | 'pdf') => {
    console.log('📤 Exportando resultados:', { format, count: results.length })
    
    const resultsToExport = selectedResults.length > 0 
      ? results.filter(r => selectedResults.includes(r.id))
      : results
    
    const success = exportResultsLocal(resultsToExport, format)
    if (success) {
      console.log('✅ Exportación completada exitosamente')
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

  // Función para mostrar los modelos IA utilizados
  const renderAIModelsUsed = (result: SearchResult) => {
    const aiModels = result.validated_data?.ai_models_used
    const processingType = result.validated_data?.processing_type
    
    if (!aiModels || aiModels.length === 0) {
      return null
    }

    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Brain className="w-4 h-4 text-blue-600" />
        <div className="flex-1">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
            {processingType === 'cross_validation' ? 'Validación Cruzada:' : 'Modelo IA:'}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {aiModels.map((model: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700">
                {model.includes('/') ? model.split('/')[1].split(':')[0] : model}
              </Badge>
            ))}
          </div>
        </div>
        {processingType === 'cross_validation' && (
          <div className="flex items-center gap-1 text-blue-600">
            <Shield className="w-3 h-3" />
            <span className="text-xs font-medium">Validado</span>
          </div>
        )}
      </div>
    )
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
            Resultados de Búsqueda
            <Badge variant="secondary">
              {results.length} encontrada{results.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedResults.length === results.length && results.length > 0}
                onCheckedChange={(checked) => {
                  handleSelectAll(checked === true)
                }}
                disabled={isProcessing}
              />
              <span className="text-sm text-muted-foreground">
                Seleccionar todo
              </span>
            </div>
          )}
        </div>
        
        {selectedResults.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">
              {selectedResults.length} seleccionada{selectedResults.length !== 1 ? 's' : ''}
            </Badge>
            
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleApproveSelected(false)}
                disabled={isProcessing}
                className="min-w-0 flex-shrink-0"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Aprobar</span>
                <span className="sm:hidden">✓</span>
              </Button>
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleApproveSelected(true)}
                disabled={isProcessing}
                className="min-w-0 flex-shrink-0"
              >
                <Calendar className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Aprobar + Calendario</span>
                <span className="sm:hidden">✓📅</span>
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRejectSelected}
                disabled={isProcessing}
                className="min-w-0 flex-shrink-0"
              >
                <XCircle className="mr-1 h-3 w-3" />
                <span className="hidden sm:inline">Rechazar</span>
                <span className="sm:hidden">✗</span>
              </Button>
            </div>
          </div>
        )}
        
        {/* Botones de exportación */}
        {results.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              Exportar {selectedResults.length > 0 ? 'seleccionadas' : 'todas'}:
            </span>
            
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportResults('txt')}
                disabled={isExporting}
                className="gap-1"
              >
                <FileText className="h-3 w-3" />
                TXT
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportResults('excel')}
                disabled={isExporting}
                className="gap-1"
              >
                <FileSpreadsheet className="h-3 w-3" />
                CSV
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportResults('pdf')}
                disabled={isExporting}
                className="gap-1"
              >
                <File className="h-3 w-3" />
                HTML
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {results.map((result) => {
          const daysUntilDeadline = result.deadline ? getDaysUntilDeadline(result.deadline) : null
          const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 30
          const isExpired = daysUntilDeadline !== null && daysUntilDeadline < 0
          const reliabilityScore = result.validated_data?.reliability_score || 0
          
          return (
            <Card key={result.id} className={cn(
              "border-l-4",
              result.approved_by_user === true && "border-l-green-500 bg-green-50",
              result.approved_by_user === false && "border-l-red-500 bg-red-50",
              result.approved_by_user === null && "border-l-blue-500",
              isExpired && "opacity-60"
            )}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedResults.includes(result.id)}
                    onCheckedChange={(checked) => {
                      handleSelectResult(result.id, checked === true)
                    }}
                    disabled={isProcessing}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {result.title}
                        </h3>
                        
                        {result.validated_data?.organization && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
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
                            Confiabilidad: {reliabilityScore}%
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
                    
                    {/* Información de Modelos IA Utilizados */}
                    {renderAIModelsUsed(result)}ame="flex items-center gap-1">
                              <Shield className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">Validación Cruzada</span>
                            </div>
                          )}
                          
                          {/* Indicador de confianza */}
                          {result.ai_confidence && (
                            <div className="flex items-center gap-1">
                              <Zap className={`h-3 w-3 ${
                                result.ai_confidence === 'high' ? 'text-green-600' : 'text-yellow-600'
                              }`} />
                              <span className={`text-xs font-medium ${
                                result.ai_confidence === 'high' ? 'text-green-700' : 'text-yellow-700'
                              }`}>
                                Confianza {result.ai_confidence === 'high' ? 'Alta' : 'Media'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
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
                        {result.approved_by_user ? 'Aprobada' : 'Rechazada'}
                        {result.added_to_calendar && (
                          <span className="text-blue-600">
                            + Añadida al calendario
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-gray-200 gap-2">
                      <div className="flex flex-wrap gap-2">
                        {result.approved_by_user === null && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveOne(result.id, false)}
                              disabled={isProcessing}
                              className="min-w-0 flex-shrink-0"
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">Aprobar</span>
                              <span className="sm:hidden">✓</span>
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleApproveOne(result.id, true)}
                              disabled={isProcessing}
                              className="min-w-0 flex-shrink-0"
                            >
                              <Calendar className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">Aprobar + Cal</span>
                              <span className="sm:hidden">✓📅</span>
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectOne(result.id)}
                              disabled={isProcessing}
                              className="min-w-0 flex-shrink-0"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">Rechazar</span>
                              <span className="sm:hidden">✗</span>
                            </Button>
                          </>
                        )}
                        
                        {/* Botón de guardar */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveOne(result)}
                          disabled={isProcessing}
                          className="min-w-0 flex-shrink-0"
                        >
                          <BookmarkPlus className="mr-1 h-3 w-3" />
                          <span className="hidden sm:inline">Guardar</span>
                          <span className="sm:hidden">💾</span>
                        </Button>
                      </div>
                      
                      {result.source_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={result.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Ver Original
                          </a>
                        </Button>
                      )}
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