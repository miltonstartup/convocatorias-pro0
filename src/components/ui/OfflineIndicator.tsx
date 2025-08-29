import React from 'react'
import { Wifi, WifiOff, RotateCcw, Database } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

interface OfflineIndicatorProps {
  className?: string
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const { isOnline, isOfflineReady } = usePWA()
  const [showOfflineMessage, setShowOfflineMessage] = React.useState(false)

  React.useEffect(() => {
    if (!isOnline) {
      setShowOfflineMessage(true)
      const timer = setTimeout(() => setShowOfflineMessage(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  // Indicador persistente de estado offline
  if (!isOnline) {
    return (
      <div className={`fixed top-16 left-4 right-4 z-40 ${className}`}>
        <div className="bg-orange-100 border border-orange-200 text-orange-800 rounded-lg p-3 mx-auto max-w-md shadow-sm">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Modo Sin Conexión
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {isOfflineReady 
                  ? 'Puedes seguir usando la aplicación con funcionalidad limitada.'
                  : 'Funcionalidad limitada disponible.'
                }
              </p>
            </div>
            <Database className="h-4 w-4 text-orange-600" />
          </div>
        </div>
      </div>
    )
  }

  // Mensaje temporal cuando vuelve la conexión
  if (isOnline && showOfflineMessage) {
    return (
      <div className={`fixed top-16 left-4 right-4 z-40 ${className}`}>
        <div className="bg-green-100 border border-green-200 text-green-800 rounded-lg p-3 mx-auto max-w-md shadow-sm">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                Conexión Restaurada
              </p>
              <p className="text-xs text-green-600 mt-1">
                Sincronizando datos...
              </p>
            </div>
            <RotateCcw className="h-4 w-4 text-green-600 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default OfflineIndicator