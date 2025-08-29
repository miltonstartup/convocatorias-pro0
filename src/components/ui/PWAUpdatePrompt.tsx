import React from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

interface PWAUpdatePromptProps {
  className?: string
}

export const PWAUpdatePrompt: React.FC<PWAUpdatePromptProps> = ({ className = '' }) => {
  const { isUpdateAvailable, updateSW } = usePWA()
  const [isUpdating, setIsUpdating] = React.useState(false)

  if (!isUpdateAvailable) return null

  const handleUpdate = async () => {
    setIsUpdating(true)
    try {
      await updateSW()
    } catch (error) {
      console.error('Error al actualizar:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className={`fixed top-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-green-600 text-white rounded-lg shadow-lg p-4 mx-auto max-w-md">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Download className="h-6 w-6 text-green-100" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              Nueva versión disponible
            </p>
            <p className="text-xs text-green-100 mt-1">
              Actualiza para obtener las últimas mejoras y funcionalidades.
            </p>
          </div>
        </div>
        
        <div className="mt-3">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full bg-white text-green-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isUpdating ? 'Actualizando...' : 'Actualizar ahora'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAUpdatePrompt