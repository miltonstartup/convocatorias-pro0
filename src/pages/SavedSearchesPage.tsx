import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSavedSearches } from '@/hooks/useSavedSearches'
import { useAISearch } from '@/hooks/useAISearch'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { 
  Star, 
  Search, 
  Trash2, 
  Clock, 
  Calendar,
  AlertCircle,
  FolderOpen,
  Play,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SavedSearchesPage() {
  const { isPro } = useAuth()
  const navigate = useNavigate()
  const { 
    savedSearches, 
    isLoading, 
    error, 
    deleteSavedSearch, 
    toggleFavorite, 
    updateLastRun,
    clearError 
  } = useSavedSearches()
  const { executeSearch, isSearching } = useAISearch()
  const [runningSearchId, setRunningSearchId] = useState<string | null>(null)

  // No permitir acceso a usuarios no Pro
  if (!isPro) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert variant="warning" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <div>
              <h4 className="font-semibold">Plan Pro Requerido</h4>
              <p className="text-sm mt-1">
                Las búsquedas guardadas están disponibles solo para usuarios Pro.
                <a href="/app/plans" className="underline font-medium ml-1">Actualizar plan</a>
              </p>
            </div>
          </Alert>
        </div>
      </div>
    )
  }

  const handleRunSearch = async (savedSearch: any) => {
    setRunningSearchId(savedSearch.id)
    clearError()
    
    // Ejecutar la búsqueda
    await executeSearch(savedSearch.original_query, savedSearch.search_parameters)
    
    // Actualizar última ejecución
    await updateLastRun(savedSearch.id)
    
    setRunningSearchId(null)
    
    // Navegar a la página de búsqueda IA para ver los resultados
    navigate('/app/ai-search')
  }

  const handleDeleteSearch = async (searchId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta búsqueda guardada?')) {
      await deleteSavedSearch(searchId)
    }
  }

  const handleToggleFavorite = async (searchId: string) => {
    await toggleFavorite(searchId)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const favoriteSearches = savedSearches.filter(search => search.is_favorite)
  const regularSearches = savedSearches.filter(search => !search.is_favorite)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Búsquedas Guardadas
              </h1>
              <p className="text-gray-600">
                Gestiona y repite tus búsquedas de convocatorias favoritas
              </p>
            </div>
            
            <Button onClick={() => navigate('/app/ai-search')}>
              <Search className="mr-2 h-4 w-4" />
              Nueva Búsqueda
            </Button>
          </div>
        </div>

        {/* Estado de carga */}
        {isLoading && (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Cargando búsquedas guardadas...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <div>
              <h4 className="font-semibold">Error</h4>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </Alert>
        )}

        {/* Sin búsquedas guardadas */}
        {!isLoading && savedSearches.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No tienes búsquedas guardadas
              </h3>
              <p className="text-muted-foreground mb-4">
                Guarda tus búsquedas para poder repetirlas fácilmente
              </p>
              <Button onClick={() => navigate('/app/ai-search')}>
                <Search className="mr-2 h-4 w-4" />
                Hacer Nueva Búsqueda
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Búsquedas favoritas */}
        {favoriteSearches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Favoritas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteSearches.map((savedSearch) => (
                <SearchCard
                  key={savedSearch.id}
                  savedSearch={savedSearch}
                  onRun={handleRunSearch}
                  onDelete={handleDeleteSearch}
                  onToggleFavorite={handleToggleFavorite}
                  isRunning={runningSearchId === savedSearch.id}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Todas las búsquedas */}
        {regularSearches.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Todas las Búsquedas
              <Badge variant="secondary">{regularSearches.length}</Badge>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularSearches.map((savedSearch) => (
                <SearchCard
                  key={savedSearch.id}
                  savedSearch={savedSearch}
                  onRun={handleRunSearch}
                  onDelete={handleDeleteSearch}
                  onToggleFavorite={handleToggleFavorite}
                  isRunning={runningSearchId === savedSearch.id}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para cada tarjeta de búsqueda
interface SearchCardProps {
  savedSearch: any
  onRun: (search: any) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
  isRunning: boolean
  formatDate: (date: string) => string
}

function SearchCard({ 
  savedSearch, 
  onRun, 
  onDelete, 
  onToggleFavorite, 
  isRunning, 
  formatDate 
}: SearchCardProps) {
  const hasParameters = Object.keys(savedSearch.search_parameters || {}).length > 0
  
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      savedSearch.is_favorite && "ring-2 ring-yellow-200"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
            {savedSearch.search_name}
          </CardTitle>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(savedSearch.id)}
            className="text-yellow-500 hover:text-yellow-600"
          >
            <Star className={cn(
              "h-4 w-4",
              savedSearch.is_favorite && "fill-current"
            )} />
          </Button>
        </div>
        
        <CardDescription className="text-sm text-gray-600 line-clamp-2">
          {savedSearch.original_query}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-3">
        {/* Parámetros de búsqueda */}
        {hasParameters && (
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
              <Settings className="h-3 w-3" />
              Filtros aplicados:
            </div>
            
            <div className="flex flex-wrap gap-1">
              {savedSearch.search_parameters.sector && (
                <Badge variant="outline" className="text-xs">
                  {savedSearch.search_parameters.sector}
                </Badge>
              )}
              {savedSearch.search_parameters.location && (
                <Badge variant="outline" className="text-xs">
                  {savedSearch.search_parameters.location}
                </Badge>
              )}
              {savedSearch.search_parameters.type && (
                <Badge variant="outline" className="text-xs">
                  {savedSearch.search_parameters.type}
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Fechas */}
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Creada: {formatDate(savedSearch.created_at)}
          </div>
          
          {savedSearch.last_run && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Última ejecución: {formatDate(savedSearch.last_run)}
            </div>
          )}
        </div>
        
        {/* Acciones */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            size="sm"
            onClick={() => onRun(savedSearch)}
            disabled={isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <LoadingSpinner size="sm" className="mr-1" />
                Ejecutando...
              </>
            ) : (
              <>
                <Play className="mr-1 h-3 w-3" />
                Repetir
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(savedSearch.id)}
            disabled={isRunning}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}