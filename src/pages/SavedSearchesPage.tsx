import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSavedSearches } from '@/hooks/useSavedSearches'
import { useAISearchReal } from '@/hooks/useAISearchReal'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Star, 
  Trash2, 
  Play, 
  Calendar,
  AlertCircle,
  BookOpen,
  RefreshCw,
  Filter,
  Clock,
  Target
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

export default function SavedSearchesPage() {
  const { user, isPro } = useAuth()
  const navigate = useNavigate()
  const { 
    savedSearches, 
    isLoading, 
    error, 
    deleteSavedSearch, 
    toggleFavorite,
    updateLastRun,
    refreshSavedSearches,
    clearError
  } = useSavedSearches()
  
  const { executeSearch } = useAISearchReal()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'recent'>('all')
  const [isExecutingSearch, setIsExecutingSearch] = useState<string | null>(null)

  // Filtrar búsquedas según criterios
  const filteredSearches = savedSearches.filter(search => {
    // Filtro por texto
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      if (!search.search_name.toLowerCase().includes(term) &&
          !search.original_query.toLowerCase().includes(term)) {
        return false
      }
    }
    
    // Filtro por tipo
    switch (filterType) {
      case 'favorites':
        return search.is_favorite
      case 'recent':
        return search.last_run && 
               new Date(search.last_run) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      default:
        return true
    }
  })

  const handleExecuteSearch = async (search: any) => {
    if (!isPro) {
      toast.error('Las búsquedas guardadas requieren Plan Pro', {
        action: {
          label: 'Ver Planes',
          onClick: () => navigate('/app/plans')
        }
      })
      return
    }

    try {
      setIsExecutingSearch(search.id)
      
      // Actualizar última ejecución
      await updateLastRun(search.id)
      
      // Ejecutar búsqueda
      await executeSearch(search.original_query, search.search_parameters)
      
      toast.success('Búsqueda ejecutada exitosamente')
      
      // Redirigir a resultados
      navigate('/app/ai-search')
      
    } catch (error) {
      console.error('Error ejecutando búsqueda:', error)
      toast.error('Error al ejecutar la búsqueda')
    } finally {
      setIsExecutingSearch(null)
    }
  }

  const handleDeleteSearch = async (searchId: string, searchName: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${searchName}"?`)) {
      const success = await deleteSavedSearch(searchId)
      if (success) {
        toast.success('Búsqueda eliminada exitosamente')
      }
    }
  }

  const handleToggleFavorite = async (searchId: string) => {
    const success = await toggleFavorite(searchId)
    if (success) {
      const search = savedSearches.find(s => s.id === searchId)
      toast.success(
        search?.is_favorite ? 'Eliminado de favoritos' : 'Añadido a favoritos'
      )
    }
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>Plan Pro Requerido:</strong> Las búsquedas guardadas están disponibles solo para usuarios Pro.
              <Button variant="link" className="px-0 h-auto font-semibold ml-1" asChild>
                <a href="/app/plans">Actualizar plan</a>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Búsquedas Guardadas</h1>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {savedSearches.length} guardada{savedSearches.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <p className="text-gray-600">
            Gestiona y ejecuta tus búsquedas de IA guardadas
          </p>
        </div>

        {/* Controles */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nombre o consulta..."
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
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filtrar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas ({savedSearches.length})</SelectItem>
                    <SelectItem value="favorites">
                      Favoritas ({savedSearches.filter(s => s.is_favorite).length})
                    </SelectItem>
                    <SelectItem value="recent">
                      Recientes ({savedSearches.filter(s => 
                        s.last_run && new Date(s.last_run) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      ).length})
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshSavedSearches}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="link" className="px-0 h-auto ml-2" onClick={clearError}>
                Cerrar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Lista de búsquedas */}
        {filteredSearches.length > 0 && (
          <div className="space-y-4">
            {filteredSearches.map((search) => (
              <Card key={search.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                          {search.search_name}
                        </h3>
                        {search.is_favorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-3">
                        <strong>Consulta:</strong> {search.original_query}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Creada {format(new Date(search.created_at), 'dd/MM/yyyy', { locale: es })}
                          </span>
                        </div>
                        
                        {search.last_run && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              Última ejecución: {formatDistanceToNow(new Date(search.last_run), { addSuffix: true, locale: es })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleFavorite(search.id)}
                        className="min-w-0"
                      >
                        <Star className={`h-3 w-3 ${search.is_favorite ? 'fill-current text-yellow-500' : ''}`} />
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleExecuteSearch(search)}
                        disabled={isExecutingSearch === search.id}
                        className="min-w-0"
                      >
                        {isExecutingSearch === search.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteSearch(search.id, search.search_name)}
                        className="min-w-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}