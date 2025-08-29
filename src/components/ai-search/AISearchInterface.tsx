import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AIProviderSelectorToggle, AIProvider } from './AIProviderSelectorToggle'
import { SearchProgress, AI_SEARCH_STEPS } from './SearchProgress'
import { SaveSearchModal } from './SaveSearchModal'
import { SearchResultsFixed } from './SearchResultsFixed'
import { useAISearchReal, SearchParameters } from '@/hooks/useAISearchReal'
import { useAuth } from '@/hooks/useAuth'
import { 
  Search, 
  Sparkles, 
  AlertCircle, 
  Settings,
  BookmarkPlus,
  Crown,
  Target,
  Globe,
  Brain
} from 'lucide-react'
import { toast } from 'sonner'

export function AISearchInterface() {
  const { isPro } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParameters, setSearchParameters] = useState<SearchParameters>({})
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('smart_flow')
  const [selectedModel, setSelectedModel] = useState('auto')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [currentStep, setCurrentStep] = useState('idle')
  
  const {
    searchResults,
    isSearching,
    searchError,
    executeSearch,
    approveResults,
    rejectResults,
    clearResults
  } = useAISearchReal()

  // Escuchar evento de plantilla desde el panel lateral
  useEffect(() => {
    const handleUseTemplate = (event: CustomEvent) => {
      setSearchQuery(event.detail.query)
    }

    window.addEventListener('useTemplate', handleUseTemplate as EventListener)
    return () => window.removeEventListener('useTemplate', handleUseTemplate as EventListener)
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Por favor ingresa una consulta de búsqueda')
      return
    }

    try {
      setCurrentStep('web-search')
      await executeSearch(searchQuery, searchParameters, selectedProvider, selectedModel)
      setCurrentStep('completed')
    } catch (error) {
      console.error('Error en búsqueda:', error)
      setCurrentStep('idle')
    }
  }

  const handleApproveResults = async (resultIds: string[], addToCalendar?: boolean) => {
    try {
      return await approveResults(resultIds, addToCalendar)
    } catch (error) {
      console.error('Error aprobando resultados:', error)
      return false
    }
  }

  const handleRejectResults = async (resultIds: string[]) => {
    try {
      return await rejectResults(resultIds)
    } catch (error) {
      console.error('Error rechazando resultados:', error)
      return false
    }
  }

  const handleClearResults = () => {
    clearResults()
    setCurrentStep('idle')
  }

  return (
    <div className="space-y-6">
      {/* Configuración de Búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Búsqueda IA Multi-Proveedor
          </CardTitle>
          <CardDescription>
            Busca convocatorias usando OpenRouter, Gemini Direct, Flujo Inteligente o Google PSE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de Proveedor */}
          <AIProviderSelectorToggle
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
          
          {/* Campo de búsqueda */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Ej: fondos CORFO para innovación tecnológica"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
                className="pl-10"
                disabled={isSearching}
              />
            </div>
          </div>
          
          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="gap-2"
            >
              {isSearching ? (
                <>
                  <LoadingSpinner size="sm" />
                  Buscando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Buscar con IA
                </>
              )}
            </Button>
            
            {searchResults.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleClearResults}
                  disabled={isSearching}
                >
                  Limpiar
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowSaveModal(true)}
                  disabled={isSearching}
                  className="gap-2"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Guardar Búsqueda
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progreso de búsqueda */}
      {isSearching && (
        <SearchProgress 
          currentStep={currentStep}
          steps={AI_SEARCH_STEPS}
        />
      )}

      {/* Error de búsqueda */}
      {searchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error en la búsqueda:</strong> {searchError}
          </AlertDescription>
        </Alert>
      )}

      {/* Resultados */}
      {searchResults.length > 0 && (
        <SearchResultsFixed
          results={searchResults}
          isSearching={isSearching}
          onApprove={handleApproveResults}
          onReject={handleRejectResults}
        />
      )}

      {/* Modal para guardar búsqueda */}
      {showSaveModal && (
        <SaveSearchModal
          searchQuery={searchQuery}
          searchParameters={searchParameters}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  )
}