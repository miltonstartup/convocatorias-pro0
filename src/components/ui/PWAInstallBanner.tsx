import React from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

interface PWAInstallBannerProps {
  className?: string
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ className = '' }) => {
  const { showInstallPrompt, installPWA, dismissInstallPrompt } = usePWA()

  if (!showInstallPrompt) return null

  const handleInstall = async () => {
    const success = await installPWA()
    if (success) {
      console.log('PWA instalada exitosamente')
    }
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-4 mx-auto max-w-md">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0">
              <Smartphone className="h-6 w-6 text-blue-100" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                Instalar ConvocatoriasPro
              </p>
              <p className="text-xs text-blue-100 mt-1">
                Accede rápidamente desde tu pantalla de inicio y recibe notificaciones.
              </p>
            </div>
          </div>
          <button
            onClick={dismissInstallPrompt}
            className="flex-shrink-0 ml-2 text-blue-100 hover:text-white transition-colors"
            aria-label="Cerrar banner de instalación"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-white text-blue-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>Instalar</span>
          </button>
          <button
            onClick={dismissInstallPrompt}
            className="px-3 py-2 text-blue-100 text-sm font-medium hover:text-white transition-colors"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}

export default PWAInstallBanner