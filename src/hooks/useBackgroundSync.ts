import { useState, useEffect, useCallback } from 'react'

interface BackgroundSyncState {
  isSupported: boolean
  isRegistered: boolean
  pendingOperations: number
  lastSyncTime: Date | null
}

interface BackgroundSyncActions {
  registerBackgroundSync: (tag: string, data?: any) => Promise<boolean>
  checkSyncStatus: () => Promise<void>
  getPendingOperations: () => Promise<any[]>
}

export const useBackgroundSync = (): BackgroundSyncState & BackgroundSyncActions => {
  const [state, setState] = useState<BackgroundSyncState>({
    isSupported: false,
    isRegistered: false,
    pendingOperations: 0,
    lastSyncTime: null
  })

  // Verificar soporte de Background Sync
  useEffect(() => {
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        setState(prev => ({ ...prev, isSupported: true }))
      }
    }
    checkSupport()
  }, [])

  // Registrar sincronización en segundo plano
  const registerBackgroundSync = useCallback(async (tag: string, data?: any): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn('Background Sync no está soportado')
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      
      // Almacenar datos para la sincronización
      if (data) {
        const pendingData = JSON.parse(localStorage.getItem('pendingSync') || '[]')
        pendingData.push({ tag, data, timestamp: Date.now() })
        localStorage.setItem('pendingSync', JSON.stringify(pendingData))
      }

      // Registrar el evento de sincronización
      await registration.sync.register(tag)
      
      setState(prev => ({ 
        ...prev, 
        isRegistered: true,
        pendingOperations: prev.pendingOperations + 1
      }))
      
      return true
    } catch (error) {
      console.error('Error al registrar Background Sync:', error)
      return false
    }
  }, [state.isSupported])

  // Verificar estado de sincronización
  const checkSyncStatus = useCallback(async (): Promise<void> => {
    try {
      const pendingData = JSON.parse(localStorage.getItem('pendingSync') || '[]')
      setState(prev => ({ 
        ...prev, 
        pendingOperations: pendingData.length,
        lastSyncTime: pendingData.length > 0 ? new Date(Math.max(...pendingData.map((item: any) => item.timestamp))) : null
      }))
    } catch (error) {
      console.error('Error al verificar estado de sincronización:', error)
    }
  }, [])

  // Obtener operaciones pendientes
  const getPendingOperations = useCallback(async (): Promise<any[]> => {
    try {
      return JSON.parse(localStorage.getItem('pendingSync') || '[]')
    } catch (error) {
      console.error('Error al obtener operaciones pendientes:', error)
      return []
    }
  }, [])

  // Verificar estado al cargar
  useEffect(() => {
    checkSyncStatus()
  }, [])

  return {
    ...state,
    registerBackgroundSync,
    checkSyncStatus,
    getPendingOperations
  }
}