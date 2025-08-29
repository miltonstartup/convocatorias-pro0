import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSavedConvocatorias, SavedConvocatoria } from '@/hooks/useSavedConvocatorias'
import { useExportResults } from '@/hooks/useExportResults'
import { 
  ExternalLink, 
  Calendar, 
  Clock, 
  DollarSign, 
  Building, 
  Tag,
  AlertTriangle,
  Search,
  Trash2,
  BookmarkX,
  StickyNote,
  Filter,
  FileText,
  Heart,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  File,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function SavedConvocatoriasPage() {
  const { 
    savedConvocatorias, 
    isLoading, 
    error, 
    loadSavedConvocatorias,
    deleteConvocatoria,
    searchSavedConvocatorias,
    filterByDeadline,
    clearError
  } = useSavedConvocatorias()
  
  const { exportResultsLocal, isExporting } = useExportResults()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'urgent' | 'expired'>('all')
  const [displayedConvocatorias, setDisplayedConvocatorias] = useState<SavedConvocatoria[]>([])
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)

  // Actualizar convocatorias mostradas cuando cambian los filtros
  useEffect(() => {
    let filtered = [...savedConvocatorias]
    
    // Aplicar búsqueda por texto
    if (searchTerm.trim()) {
      filtered = searchSavedConvocatorias(searchTerm)
    }
    
    // Aplicar filtros por deadline
    switch (filterType) {
      case 'urgent':
        filtered = filtered.filter(conv => {
          if (!conv.deadline) return false
          const daysUntil = getDaysUntilDeadline(conv.deadline)
          return daysUntil !== null && daysUntil > 0 && daysUntil <= 30
        })
        break
      case 'expired':
        filtered = filtered.filter(conv => {
          if (!conv.deadline) return false
          const daysUntil = getDaysUntilDeadline(conv.deadline)
          return daysUntil !== null && daysUntil < 0
        })
        break
      case 'active':
        filtered = filtered.filter(conv => {
          if (!conv.deadline) return true
          const daysUntil = getDaysUntilDeadline(conv.deadline)
          return daysUntil === null || daysUntil >= 0
        })
        break
      case 'all':
      default:
        // No filtrar nada adicional
        break
    }
    
    setDisplayedConvocatorias(filtered)
  }, [savedConvocatorias, searchTerm, filterType, searchSavedConvocatorias])

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleDeleteConvocatoria = async (id: string, title: string) => {
    if (isDeletingId) return
    
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar "${title}"?`)
    if (!confirmed) return
    
    setIsDeletingId(id)
    console.log('🗑️ Eliminando convocatoria guardada:', { id, title })
    
    try {
      const success = await deleteConvocatoria(id)
      if (success) {
        console.log('✅ Convocatoria eliminada correctamente')
      }
    } catch (error) {
      console.error('❌ Error al eliminar convocatoria:', error)
    } finally {
      setIsDeletingId(null)
    }
  }

  const handleExportConvocatorias = (format: 'txt' | 'excel' | 'pdf') => {
    console.log('📤 Exportando convocatorias guardadas:', { format, count: displayedConvocatorias.length })
    
    // Convertir SavedConvocatoria a SearchResult para usar el hook de exportación
    const resultsToExport = displayedConvocatorias.map(conv => ({
      id: conv.id,
      title: conv.title,
      description: conv.description || '',
      deadline: conv.deadline || '',
      amount: conv.amount || '',
      requirements: conv.requirements || '',
      source_url: conv.source_url || '',
      validated_data: {
        organization: conv.organization || '',
        tags: conv.tags || [],
        category: 'Guardada'
      }
    })) as any[]
    
    const success = exportResultsLocal(resultsToExport, format)
    if (success) {
      console.log('✅ Exportación de convocatorias guardadas completada')
    }
  }

  const generateCalendarUrl = (convocatoria: SavedConvocatoria) => {
    const startDate = convocatoria.deadline ? new Date(convocatoria.deadline) : new Date()
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hora después
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Convocatoria: ${convocatoria.title}`,
      dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
      details: `${convocatoria.description || ''}

Organización: ${convocatoria.organization || 'No especificada'}
Monto: ${convocatoria.amount || 'No especificado'}

Ver más: ${convocatoria.source_url || ''}`,
      location: convocatoria.organization || '',
      trp: 'false'
    })
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  }

  const getFilterLabel = (type: string) => {
    switch (type) {
      case 'all': return 'Todas'
      case 'active': return 'Activas'
      case 'urgent': return 'Urgentes (≤30 días)'
      case 'expired': return 'Vencidas'
      default: return 'Todas'
    }
  }

  const getFilterCount = (type: string) => {
    switch (type) {
      case 'all': return savedConvocatorias.length
      case 'active': return savedConvocatorias.filter(conv => {
        if (!conv.deadline) return true
        const daysUntil = getDaysUntilDeadline(conv.deadline)
        return daysUntil === null || daysUntil >= 0
      }).length
      case 'urgent': return savedConvocatorias.filter(conv => {
        if (!conv.deadline) return false
        const daysUntil = getDaysUntilDeadline(conv.deadline)
        return daysUntil !== null && daysUntil > 0 && daysUntil <= 30
      }).length
      case 'expired': return savedConvocatorias.filter(conv => {
        if (!conv.deadline) return false
        const daysUntil = getDaysUntilDeadline(conv.deadline)
        return daysUntil !== null && daysUntil < 0
      }).length
      default: return 0
    }
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar convocatorias</h3>
            <p className="text-sm mb-4">{error}</p>
            <Button 
              onClick={() => {
                clearError()
                loadSavedConvocatorias()
              }}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con título y contador */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convocatorias Guardadas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona y revisa tus convocatorias guardadas
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          <Badge variant="secondary">
            {savedConvocatorias.length} guardada{savedConvocatorias.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Controles de búsqueda y filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Primera fila: Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por título, descripción, organización o tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {getFilterLabel('all')} ({getFilterCount('all')})
                    </SelectItem>
                    <SelectItem value="active">
                      {getFilterLabel('active')} ({getFilterCount('active')})
                    </SelectItem>
                    <SelectItem value="urgent">
                      {getFilterLabel('urgent')} ({getFilterCount('urgent')})
                    </SelectItem>
                    <SelectItem value="expired">
                      {getFilterLabel('expired')} ({getFilterCount('expired')})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Segunda fila: Botones de exportación */}
            {displayedConvocatorias.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Download className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-muted-foreground">
                  Exportar {displayedConvocatorias.length} convocatoria{displayedConvocatorias.length !== 1 ? 's' : ''}:
                </span>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportConvocatorias('txt')}
                    disabled={isExporting}
                    className="gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    TXT
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportConvocatorias('excel')}
                    disabled={isExporting}
                    className="gap-1"
                  >
                    <FileSpreadsheet className="h-3 w-3" />
                    CSV
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportConvocatorias('pdf')}
                    disabled={isExporting}
                    className="gap-1"
                  >
                    <File className="h-3 w-3" />
                    HTML
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de convocatorias */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Cargando convocatorias...</h3>
            <p className="text-sm text-muted-foreground">Por favor espera mientras cargamos tus convocatorias guardadas.</p>
          </CardContent>
        </Card>
      ) : displayedConvocatorias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground">
              <BookmarkX className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || filterType !== 'all' 
                  ? 'No se encontraron convocatorias' 
                  : 'Sin convocatorias guardadas'}
              </h3>
              <p className="text-sm">
                {searchTerm || filterType !== 'all'
                  ? 'Prueba ajustando los filtros de búsqueda.'
                  : 'Comienza guardando convocatorias desde los resultados de búsqueda IA.'}
              </p>
              {(searchTerm || filterType !== 'all') && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm('')
                    setFilterType('all')
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedConvocatorias.map((convocatoria) => {
            const daysUntilDeadline = convocatoria.deadline ? getDaysUntilDeadline(convocatoria.deadline) : null
            const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 30 && daysUntilDeadline > 0
            const isExpired = daysUntilDeadline !== null && daysUntilDeadline < 0
            
            return (
              <Card key={convocatoria.id} className={cn(
                "border-l-4",
                isExpired && "border-l-red-500 opacity-75",
                isUrgent && "border-l-orange-500",
                !isUrgent && !isExpired && "border-l-blue-500"
              )}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {convocatoria.title}
                        </h3>
                        
                        {convocatoria.organization && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {convocatoria.organization}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="text-xs">
                          Guardada {new Date(convocatoria.created_at).toLocaleDateString()}
                        </Badge>
                        
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs">
                            Vencida
                          </Badge>
                        )}
                        
                        {isUrgent && (
                          <Badge variant="default" className="text-xs bg-orange-500">
                            Urgente
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Descripción */}
                    {convocatoria.description && (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {convocatoria.description}
                      </p>
                    )}
                    
                    {/* Información clave */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {convocatoria.amount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-700">{convocatoria.amount}</span>
                        </div>
                      )}
                      
                      {convocatoria.deadline && (
                        <div className={cn(
                          "flex items-center gap-2",
                          isUrgent && "text-orange-600",
                          isExpired && "text-red-600"
                        )}>
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            {new Date(convocatoria.deadline).toLocaleDateString()}
                            {daysUntilDeadline !== null && (
                              <span className="ml-1 text-xs">
                                ({daysUntilDeadline > 0 ? `${daysUntilDeadline} días` : 'Vencida'})
                              </span>
                            )}
                          </span>
                          {isUrgent && (
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      )}
                      
                      {convocatoria.requirements && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="truncate text-blue-700">Ver requisitos</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Tags */}
                    {convocatoria.tags && convocatoria.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {convocatoria.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Notas */}
                    {convocatoria.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <StickyNote className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800 mb-1">Notas:</p>
                            <p className="text-sm text-yellow-700">{convocatoria.notes}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Requisitos */}
                    {convocatoria.requirements && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-gray-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-800 mb-1">Requisitos:</p>
                            <p className="text-sm text-gray-700">{convocatoria.requirements}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-gray-200 gap-2">
                      <div className="flex flex-wrap gap-2">
                        {convocatoria.deadline && (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="min-w-0 flex-shrink-0"
                          >
                            <a 
                              href={generateCalendarUrl(convocatoria)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Calendar className="mr-1 h-3 w-3" />
                              <span className="hidden sm:inline">Agregar al Calendario</span>
                              <span className="sm:hidden">📅</span>
                            </a>
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteConvocatoria(convocatoria.id, convocatoria.title)}
                          disabled={isDeletingId === convocatoria.id}
                          className="min-w-0 flex-shrink-0"
                        >
                          {isDeletingId === convocatoria.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1 h-3 w-3" />
                          )}
                          <span className="hidden sm:inline">Eliminar</span>
                          <span className="sm:hidden">🗑️</span>
                        </Button>
                      </div>
                      
                      {convocatoria.source_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a 
                            href={convocatoria.source_url} 
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SavedConvocatoriasPage