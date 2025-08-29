import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import {
  Download,
  FileText,
  Filter,
  Calendar,
  Building,
  Tag,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle,
  FileDown,
  Crown,
  Lock
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { useConvocatorias } from '@/hooks/useConvocatorias'
import { aiService, ExportRequest } from '@/services/ai.service'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ExportFilters {
  status?: string
  organization?: string
  category?: string
  date_from?: string
  date_to?: string
  search?: string
}

interface ExportOptions {
  include_description?: boolean
  include_requirements?: boolean
  sort_by?: 'date' | 'name' | 'institution'
  sort_order?: 'asc' | 'desc'
}

export function ExportPage() {
  const { user } = useAuth()
  const { isProPlan, canAccessFeature } = usePlans()
  const { convocatorias } = useConvocatorias()
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'pdf'>('csv')
  const [filters, setFilters] = useState<ExportFilters>({})
  const [options, setOptions] = useState<ExportOptions>({
    include_description: true,
    include_requirements: true,
    sort_by: 'date',
    sort_order: 'desc'
  })
  
  const [organizations, setOrganizations] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])

  useEffect(() => {
    if (convocatorias) {
      // Extraer organizaciones únicas
      const uniqueOrgs = [...new Set(convocatorias.map(c => c.institucion).filter(Boolean))]
      setOrganizations(uniqueOrgs)
      
      // Extraer categorías únicas
      const uniqueCategories = [...new Set(convocatorias.map(c => c.area).filter(Boolean))]
      setCategories(uniqueCategories)
      
      // Generar vista previa con filtros aplicados
      generatePreview()
    }
  }, [convocatorias, filters])

  const generatePreview = () => {
    if (!convocatorias) return
    
    let filtered = convocatorias.filter(conv => {
      if (filters.status && conv.estado !== filters.status) return false
      if (filters.organization && conv.institucion !== filters.organization) return false
      if (filters.category && conv.area !== filters.category) return false
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (!conv.nombre_concurso.toLowerCase().includes(searchLower) &&
            !conv.institucion?.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      if (filters.date_from && conv.fecha_cierre < filters.date_from) return false
      if (filters.date_to && conv.fecha_cierre > filters.date_to) return false
      
      return true
    })
    
    // Ordenar según opciones
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (options.sort_by) {
        case 'name':
          comparison = a.nombre_concurso.localeCompare(b.nombre_concurso)
          break
        case 'institution':
          comparison = (a.institucion || '').localeCompare(b.institucion || '')
          break
        case 'date':
        default:
          comparison = new Date(a.fecha_cierre).getTime() - new Date(b.fecha_cierre).getTime()
          break
      }
      
      return options.sort_order === 'desc' ? -comparison : comparison
    })
    
    setPreviewData(filtered.slice(0, 5)) // Mostrar solo 5 para vista previa
  }

  const handleExport = async () => {
    if (!canAccessFeature('export_data')) {
      toast.error('La exportación avanzada requiere Plan Pro', {
        action: {
          label: 'Ver Planes',
          onClick: () => window.location.href = '/app/plans'
        }
      })
      return
    }
    
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      // Simular progreso
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)
      
      const exportRequest: ExportRequest = {
        format: selectedFormat,
        filters,
        options
      }
      
      const result = await aiService.exportData(exportRequest)
      
      clearInterval(progressInterval)
      setExportProgress(100)
      
      if (result.success) {
        if (selectedFormat === 'csv' && result.content) {
          // Descargar CSV
          aiService.downloadCSV(result.content, result.filename)
          toast.success(`Archivo ${result.format.toUpperCase()} exportado exitosamente`)
        } else if (selectedFormat === 'pdf' && result.download_url) {
          // Abrir PDF
          window.open(result.download_url, '_blank')
          toast.success('PDF generado exitosamente')
        }
      } else {
        throw new Error('Error en la exportación')
      }
      
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Error al exportar los datos')
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportProgress(0), 2000)
    }
  }

  const updateFilter = <K extends keyof ExportFilters>(key: K, value: ExportFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const canExport = canAccessFeature('export_data')
  const totalFiltered = convocatorias?.filter(conv => {
    if (filters.status && conv.estado !== filters.status) return false
    if (filters.organization && conv.institucion !== filters.organization) return false
    if (filters.category && conv.area !== filters.category) return false
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!conv.nombre_concurso.toLowerCase().includes(searchLower) &&
          !conv.institucion?.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    if (filters.date_from && conv.fecha_cierre < filters.date_from) return false
    if (filters.date_to && conv.fecha_cierre > filters.date_to) return false
    return true
  }).length || 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exportar Datos</h1>
          <p className="text-muted-foreground">
            Exporta tus convocatorias en formato CSV o PDF
          </p>
        </div>
        
        {canExport ? (
          <Badge className="bg-green-500">
            <Crown className="mr-1 h-3 w-3" />
            Pro Activado
          </Badge>
        ) : (
          <Badge variant="secondary">
            <Lock className="mr-1 h-3 w-3" />
            Plan Pro Requerido
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Panel de filtros */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Selecciona qué datos exportar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Búsqueda */}
              <div className="space-y-2">
                <Label>Búsqueda</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o institución..."
                    value={filters.search || ''}
                    onChange={(e) => updateFilter('search', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {/* Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={filters.status || ''} onValueChange={(value) => updateFilter('status', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los estados</SelectItem>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                    <SelectItem value="en_evaluacion">En evaluación</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Organización */}
              <div className="space-y-2">
                <Label>Organización</Label>
                <Select value={filters.organization || ''} onValueChange={(value) => updateFilter('organization', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las organizaciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las organizaciones</SelectItem>
                    {organizations.map(org => (
                      <SelectItem key={org} value={org}>{org}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Categoría */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={filters.category || ''} onValueChange={(value) => updateFilter('category', value || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las categorías</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Rango de fechas */}
              <div className="space-y-2">
                <Label>Fecha de cierre</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="Desde"
                    value={filters.date_from || ''}
                    onChange={(e) => updateFilter('date_from', e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Hasta"
                    value={filters.date_to || ''}
                    onChange={(e) => updateFilter('date_to', e.target.value)}
                  />
                </div>
              </div>
              
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Limpiar filtros
              </Button>
              
              <div className="pt-2 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{totalFiltered}</span> registros para exportar
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Panel principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Opciones de exportación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Opciones de Exportación
              </CardTitle>
              <CardDescription>
                Configura el formato y contenido de la exportación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formato */}
              <div className="space-y-2">
                <Label>Formato de archivo</Label>
                <Select value={selectedFormat} onValueChange={(value: 'csv' | 'pdf') => setSelectedFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        CSV (Excel compatible)
                      </div>
                    </SelectItem>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        PDF (Documento)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              {/* Contenido */}
              <div className="space-y-3">
                <Label>Incluir en la exportación</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include_description" 
                      checked={options.include_description} 
                      onCheckedChange={(value) => updateOption('include_description', !!value)}
                    />
                    <Label htmlFor="include_description">Descripción completa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include_requirements" 
                      checked={options.include_requirements} 
                      onCheckedChange={(value) => updateOption('include_requirements', !!value)}
                    />
                    <Label htmlFor="include_requirements">Requisitos</Label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Ordenamiento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ordenar por</Label>
                  <Select value={options.sort_by} onValueChange={(value: any) => updateOption('sort_by', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Fecha de cierre</SelectItem>
                      <SelectItem value="name">Nombre</SelectItem>
                      <SelectItem value="institution">Institución</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orden</Label>
                  <Select value={options.sort_order} onValueChange={(value: any) => updateOption('sort_order', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascendente</SelectItem>
                      <SelectItem value="desc">Descendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Vista previa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Vista Previa
              </CardTitle>
              <CardDescription>
                Primeros 5 registros que se exportarán
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="space-y-4">
                  {previewData.map((conv, index) => (
                    <div key={conv.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium truncate pr-4">{conv.nombre_concurso}</h4>
                        <Badge variant={conv.estado === 'abierto' ? 'default' : 'secondary'}>
                          {conv.estado}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {conv.institucion}
                        </p>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Cierre: {format(new Date(conv.fecha_cierre), 'dd/MM/yyyy', { locale: es })}
                        </p>
                        {conv.area && (
                          <p className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {conv.area}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {totalFiltered > 5 && (
                    <div className="text-center p-4 text-muted-foreground">
                      Y {totalFiltered - 5} registros más...
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay registros que coincidan con los filtros</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Botón de exportación */}
          <Card>
            <CardContent className="p-6">
              {canExport ? (
                <div className="space-y-4">
                  {isExporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Generando exportación...</span>
                        <span>{exportProgress}%</span>
                      </div>
                      <Progress value={exportProgress} className="w-full" />
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleExport}
                    disabled={isExporting || totalFiltered === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isExporting ? (
                      <>
                        <Download className="mr-2 h-4 w-4 animate-pulse" />
                        Exportando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Exportar {totalFiltered} registros en {selectedFormat.toUpperCase()}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <strong>Plan Pro requerido:</strong> La exportación avanzada está disponible solo para usuarios con Plan Pro.
                    </div>
                    <Button size="sm" asChild>
                      <a href="/app/plans">Actualizar Plan</a>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}