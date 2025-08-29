import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { SearchProgress, AI_SEARCH_STEPS } from './SearchProgress'
import { SearchResultsFixed } from './SearchResultsFixed'
import AIProviderSelectorToggle, { AIProvider, AIProviderConfig } from './AIProviderSelectorToggle'
import { useAISearchReal, SearchParameters } from '@/hooks/useAISearchReal'
import { useGeminiSearch } from '@/hooks/useGeminiSearch'
import { useAuth } from '@/hooks/useAuth'
import { Search, Sparkles, Brain, Zap, Target, Clock } from 'lucide-react'
import { toast } from 'sonner'

export function AISearchInterface() {
  const { isPro } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParameters, setSearchParameters] = useState<SearchParameters>({})
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini_smart')
  const [selectedModel, setSelectedModel] = useState<string>()
  
  // Hook para OpenRouter (existente)
  const {
    isSearching: isOpenRouterSearching,
    searchResults: openRouterResults,
    currentSearchId: openRouterSearchId,
    processingInfo,
    currentStep: openRouterStep,
    executeSearch: executeOpenRouterSearch,
    approveResults,
    rejectResults
  } = useAISearchReal()
  
  // Hook para Gemini (nuevo)
  const {
    isSearching: isGeminiSearching,
    searchResults: geminiResults,
    searchState,
    executeSmartSearch,
    executeDirectSearch,
    getProgressState
  } = useGeminiSearch()
  
  // Estados unificados
  const isSearching = isOpenRouterSearching || isGeminiSearching
  const searchResults = selectedProvider === 'openrouter' ? openRouterResults : geminiResults
  const currentSearchId = selectedProvider === 'openrouter' ? openRouterSearchId : null

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Por favor, ingresa una consulta de búsqueda')
      return
    }

    try {
      switch (selectedProvider) {
        case 'openrouter':
          await executeOpenRouterSearch(searchQuery, searchParameters)
          break
        case 'gemini_direct':
          await executeDirectSearch(searchQuery, 'gemini-1.5-pro', searchParameters)
          break
        case 'gemini_smart':
          await executeSmartSearch(searchQuery, searchParameters)
          break
        default:
          toast.error('Proveedor no válido seleccionado')
      }
    } catch (error) {
      console.error('Error en búsqueda:', error)
    }
  }

  const handleParameterChange = (key: keyof SearchParameters, value: string) => {
    // Convertir valores especiales a undefined para compatibilidad con la API
    let processedValue = value
    if (value === 'todos_sectores' || value === 'todas_regiones') {
      processedValue = ''
    }
    
    setSearchParameters(prev => ({
      ...prev,
      [key]: processedValue || undefined
    }))
  }
  
  const handleProviderChange = (config: AIProviderConfig) => {
    setSelectedProvider(config.provider)
    setSelectedModel(config.model)
  }
  
  // Escuchar eventos de plantillas
  useEffect(() => {
    const handleUseTemplate = (event: CustomEvent) => {
      setSearchQuery(event.detail.query)
    }
    
    window.addEventListener('useTemplate', handleUseTemplate as EventListener)
    return () => window.removeEventListener('useTemplate', handleUseTemplate as EventListener)
  }, [])
  
  // Obtener estado de progreso para Gemini
  const progressState = selectedProvider.startsWith('gemini') ? getProgressState() : null

  return (
    <div className="space-y-6">
      {/* Selector de Proveedor IA con funcionalidad toggle */}
      <AIProviderSelectorToggle
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onProviderChange={handleProviderChange}
        isProUser={isPro}
        disabled={isSearching}
        defaultExpanded={false}
      />
      
      {/* Header con indicador dinámico */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                selectedProvider === 'openrouter' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                  : selectedProvider === 'gemini_direct'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : 'bg-gradient-to-r from-green-500 to-blue-500'
              }`}>
                {selectedProvider === 'gemini_smart' ? (
                  <Target className="h-6 w-6 text-white" />
                ) : (
                  <Brain className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedProvider === 'openrouter' && 'Búsqueda IA con OpenRouter'}
                  {selectedProvider === 'gemini_direct' && 'Búsqueda Directa con Gemini 2.5 Pro'}
                  {selectedProvider === 'gemini_smart' && 'Flujo Inteligente Gemini 2.5'}
                  <Badge variant="secondary" className={`${
                    selectedProvider === 'openrouter' 
                      ? 'bg-blue-100 text-blue-800'
                      : selectedProvider === 'gemini_direct'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    <Sparkles className="h-3 w-3 mr-1" />
                    {selectedProvider === 'openrouter' && 'OpenRouter'}
                    {selectedProvider === 'gemini_direct' && 'Gemini 2.5 Pro'}
                    {selectedProvider === 'gemini_smart' && 'Gemini 2.5 Smart'}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedProvider === 'openrouter' && 'Búsqueda con múltiples modelos y validación cruzada'}
                  {selectedProvider === 'gemini_direct' && 'Procesamiento directo con Gemini 2.5 Pro'}
                  {selectedProvider === 'gemini_smart' && 'Flujo optimizado: Flash-Lite 2.5 + Pro 2.5 para máxima precisión'}
                </p>
              </div>
            </div>
            
            {/* Información de procesamiento */}
            {processingInfo && selectedProvider === 'openrouter' && (
              <div className="text-right">
                <div className="text-sm font-medium">Resultados Procesados</div>
                <div className="text-xs text-muted-foreground">
                  Web: {processingInfo.web_results_found} | IA: {processingInfo.ai_processed} | Validados: {processingInfo.links_validated}
                </div>
              </div>
            )}
            
            {/* Progreso para Gemini */}
            {progressState && selectedProvider.startsWith('gemini') && (
              <div className="text-right">
                <div className="text-sm font-medium">{progressState.message}</div>
                <div className="w-32 mt-1">
                  <Progress value={progressState.progress} className="h-2" />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Campo de búsqueda principal */}
          <div className="space-y-2">
            <Label htmlFor="search-query">Consulta de Búsqueda</Label>
            <div className="flex gap-2">
              <Input
                id="search-query"
                placeholder="Ej: fondos para startups tecnológicas, becas de innovación, financiamiento PyME..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
                disabled={isSearching}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isSearching ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-pulse" />
                    Procesando IA...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar con IA
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Parámetros de búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Select
                value={searchParameters.sector || 'todos_sectores'}
                onValueChange={(value) => handleParameterChange('sector', value)}
                disabled={isSearching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos_sectores">Todos los sectores</SelectItem>
                  <SelectItem value="Tecnología">Tecnología</SelectItem>
                  <SelectItem value="Innovación">Innovación</SelectItem>
                  <SelectItem value="Emprendimiento">Emprendimiento</SelectItem>
                  <SelectItem value="Investigación">Investigación</SelectItem>
                  <SelectItem value="MIPYME">MIPYME</SelectItem>
                  <SelectItem value="Agricultura">Agricultura</SelectItem>
                  <SelectItem value="Energía">Energía</SelectItem>
                  <SelectItem value="Educación">Educación</SelectItem>
                  <SelectItem value="Salud">Salud</SelectItem>
                  <SelectItem value="Cultura">Cultura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Región</Label>
              <Select
                value={searchParameters.location || 'todas_regiones'}
                onValueChange={(value) => handleParameterChange('location', value)}
                disabled={isSearching}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar región" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas_regiones">Todas las regiones</SelectItem>
                  <SelectItem value="Metropolitana">Región Metropolitana</SelectItem>
                  <SelectItem value="Valparaíso">Valparaíso</SelectItem>
                  <SelectItem value="Biobío">Biobío</SelectItem>
                  <SelectItem value="La Araucanía">La Araucanía</SelectItem>
                  <SelectItem value="Los Lagos">Los Lagos</SelectItem>
                  <SelectItem value="Antofagasta">Antofagasta</SelectItem>
                  <SelectItem value="Maule">Maule</SelectItem>
                  <SelectItem value="Atacama">Atacama</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-amount">Monto Mínimo (CLP)</Label>
              <Input
                id="min-amount"
                placeholder="Ej: 1000000"
                value={searchParameters.min_amount || ''}
                onChange={(e) => handleParameterChange('min_amount', e.target.value)}
                disabled={isSearching}
                type="number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progreso de búsqueda */}
      {isSearching && (
        <div className="animate-in slide-in-from-top-2 duration-300">
          {selectedProvider === 'openrouter' ? (
            <SearchProgress 
              currentStep={openRouterStep}
              steps={AI_SEARCH_STEPS}
            />
          ) : selectedProvider.startsWith('gemini') ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedProvider === 'gemini_smart' ? (
                        <Target className="h-5 w-5 text-green-500" />
                      ) : (
                        <Sparkles className="h-5 w-5 text-blue-500" />
                      )}
                      <span className="font-medium">
                        {progressState?.message || 'Procesando...'}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {Math.round(progressState?.progress || 0)}%
                    </Badge>
                  </div>
                  
                  <Progress value={progressState?.progress || 0} className="h-2" />
                  
                  {selectedProvider === 'gemini_smart' && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          searchState.stepProgress.step1_completed ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        <span>Paso 1: Lista rápida</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          searchState.stepProgress.step2_completed ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                        <span>Paso 2: Análisis detallado</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {/* Resultados */}
      {searchResults.length > 0 && (
        <div className="animate-in slide-in-from-bottom-2 duration-500">
          <SearchResultsFixed 
            results={searchResults}
            searchId={currentSearchId}
            isSearching={isSearching}
            onApprove={approveResults}
            onReject={rejectResults}
          />
        </div>
      )}
    </div>
  )
}