import React from 'react'
import PWAInstallBanner from './PWAInstallBanner'
import PWAUpdatePrompt from './PWAUpdatePrompt'
import OfflineIndicator from './OfflineIndicator'

interface PWAProviderProps {
  children: React.ReactNode
}

/**
 * Proveedor principal para todas las funcionalidades PWA
 * Incluye banner de instalación, prompts de actualización e indicadores de estado
 */
export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  return (
    <>
      {children}
      
      {/* Indicadores y prompts PWA */}
      <OfflineIndicator />
      <PWAUpdatePrompt />
      <PWAInstallBanner />
    </>
  )
}

export default PWAProvider