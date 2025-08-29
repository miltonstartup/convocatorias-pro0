import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert } from '@/components/ui/alert'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSavedSearches } from '@/hooks/useSavedSearches'
import { SearchParameters } from '@/hooks/useAISearch'
import { AlertCircle, Star, Save } from 'lucide-react'

interface SaveSearchModalProps {
  searchQuery: string
  searchParameters: SearchParameters
  onClose: () => void
}

export function SaveSearchModal({ searchQuery, searchParameters, onClose }: SaveSearchModalProps) {
  const { saveSearch, error, clearError } = useSavedSearches()
  const [searchName, setSearchName] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!searchName.trim()) {
      return
    }

    setIsLoading(true)
    clearError()
    
    const success = await saveSearch(
      searchName.trim(),
      searchQuery,
      searchParameters,
      isFavorite
    )
    
    setIsLoading(false)
    
    if (success) {
      onClose()
    }
  }

  const handleClose = () => {
    clearError()
    onClose()
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Guardar Búsqueda
          </DialogTitle>
          <DialogDescription>
            Guarda esta búsqueda para repetirla más tarde
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Mostrar consulta actual */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-semibold text-sm text-gray-900 mb-1">Consulta:</h4>
            <p className="text-sm text-gray-700">{searchQuery}</p>
            
            {Object.keys(searchParameters).length > 0 && (
              <div className="mt-2">
                <h4 className="font-semibold text-sm text-gray-900 mb-1">Parámetros:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  {searchParameters.sector && (
                    <div>Sector: {searchParameters.sector}</div>
                  )}
                  {searchParameters.location && (
                    <div>Localidad: {searchParameters.location}</div>
                  )}
                  {searchParameters.min_amount && (
                    <div>Monto mínimo: {searchParameters.min_amount}</div>
                  )}
                  {searchParameters.max_amount && (
                    <div>Monto máximo: {searchParameters.max_amount}</div>
                  )}
                  {searchParameters.deadline_from && (
                    <div>Deadline desde: {searchParameters.deadline_from}</div>
                  )}
                  {searchParameters.deadline_to && (
                    <div>Deadline hasta: {searchParameters.deadline_to}</div>
                  )}
                  {searchParameters.type && (
                    <div>Tipo: {searchParameters.type}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Nombre de la búsqueda */}
          <div>
            <Label htmlFor="search-name">Nombre de la búsqueda</Label>
            <Input
              id="search-name"
              placeholder="Ej: Financiamientos videojuegos 2025"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          
          {/* Marcar como favorito */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-favorite"
              checked={isFavorite}
              onCheckedChange={(checked) => setIsFavorite(checked as boolean)}
              disabled={isLoading}
            />
            <Label htmlFor="is-favorite" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              Marcar como favorito
            </Label>
          </div>
          
          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <div>
                <h4 className="font-semibold">Error</h4>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || !searchName.trim()}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}