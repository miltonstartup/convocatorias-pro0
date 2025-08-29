import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

interface PWAState {
  isInstallable: boolean
  isInstalled: boolean
  isUpdateAvailable: boolean
  isOnline: boolean
  isOfflineReady: boolean
  showInstallPrompt: boolean
  notificationPermission: NotificationPermission
  pushSubscription: PushSubscription | null
}

interface PWAActions {
  installPWA: () => Promise<boolean>
  updateSW: () => Promise<void>
  dismissInstallPrompt: () => void
  requestNotificationPermission: () => Promise<NotificationPermission>
  subscribeToPush: () => Promise<boolean>
  unsubscribeFromPush: () => Promise<boolean>
  sendTestNotification: (title: string, body: string) => void
}

export const usePWA = (): PWAState & PWAActions => {
  const { user } = useAuth()
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isUpdateAvailable: false,
    isOnline: navigator.onLine,
    isOfflineReady: false,
    showInstallPrompt: false,
    notificationPermission: 'default',
    pushSubscription: null
  })

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Verificar estado de instalación
  useEffect(() => {
    const checkInstallStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as any).standalone === true
      const isInstalled = isStandalone || isInWebAppiOS
      
      setState(prev => ({ ...prev, isInstalled }))
    }

    checkInstallStatus()
    
    // Escuchar cambios en el modo de visualización
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstallStatus)
    
    return () => mediaQuery.removeEventListener('change', checkInstallStatus)
  }, [])

  // Manejar evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setState(prev => ({ 
        ...prev, 
        isInstallable: true,
        showInstallPrompt: !prev.isInstalled
      }))
    }

    const handleAppInstalled = () => {
      setState(prev => ({ 
        ...prev, 
        isInstalled: true,
        isInstallable: false,
        showInstallPrompt: false
      }))
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Verificar estado de conexión
  useEffect(() => {
    const updateOnlineStatus = () => {
      setState(prev => ({ ...prev, isOnline: navigator.onLine }))
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  // Verificar service worker y actualizaciones
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setState(prev => ({ ...prev, isOfflineReady: true }))
        
        // Verificar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setState(prev => ({ ...prev, isUpdateAvailable: true }))
              }
            })
          }
        })
      })
    }
  }, [])

  // Verificar permisos de notificación
  useEffect(() => {
    if ('Notification' in window) {
      setState(prev => ({ 
        ...prev, 
        notificationPermission: Notification.permission 
      }))
    }
  }, [])

  // Verificar suscripción push existente
  useEffect(() => {
    const checkPushSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()
          setState(prev => ({ ...prev, pushSubscription: subscription }))
        } catch (error) {
          console.error('Error checking push subscription:', error)
        }
      }
    }

    checkPushSubscription()
  }, [])

  // Instalar PWA
  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setState(prev => ({ 
          ...prev, 
          isInstalled: true,
          showInstallPrompt: false
        }))
        setDeferredPrompt(null)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error installing PWA:', error)
      return false
    }
  }, [deferredPrompt])

  // Actualizar service worker
  const updateSW = useCallback(async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' })
          window.location.reload()
        }
      } catch (error) {
        console.error('Error updating service worker:', error)
      }
    }
  }, [])

  // Descartar prompt de instalación
  const dismissInstallPrompt = useCallback(() => {
    setState(prev => ({ ...prev, showInstallPrompt: false }))
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }, [])

  // Solicitar permisos de notificación
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    setState(prev => ({ ...prev, notificationPermission: permission }))
    return permission
  }, [])

  // Suscribirse a notificaciones push
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    try {
      // Obtener clave VAPID pública
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-notifications', {
        body: { action: 'get_vapid_key' }
      })

      if (vapidError || !vapidData?.vapid_public_key) {
        throw new Error('No se pudo obtener la clave VAPID')
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidData.vapid_public_key
      })

      // Guardar suscripción en el servidor
      const { error: subscribeError } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'subscribe',
          subscription: subscription.toJSON(),
          user_id: user.id
        }
      })

      if (subscribeError) {
        throw new Error(subscribeError.message)
      }

      setState(prev => ({ ...prev, pushSubscription: subscription }))
      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return false
    }
  }, [user])

  // Desuscribirse de notificaciones push
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!state.pushSubscription) {
      return false
    }

    try {
      await state.pushSubscription.unsubscribe()
      
      // Notificar al servidor
      await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'unsubscribe',
          subscription: state.pushSubscription.toJSON()
        }
      })

      setState(prev => ({ ...prev, pushSubscription: null }))
      return true
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }, [state.pushSubscription])

  // Enviar notificación de prueba
  const sendTestNotification = useCallback((title: string, body: string) => {
    if (state.notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png'
      })
    }
  }, [state.notificationPermission])

  return {
    ...state,
    installPWA,
    updateSW,
    dismissInstallPrompt,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification
  }
}