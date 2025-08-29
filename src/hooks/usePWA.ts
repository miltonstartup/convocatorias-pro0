import { useState, useEffect, useCallback } from 'react'
import { Workbox } from 'workbox-window'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAState {
  // Instalación
  isInstallable: boolean
  isInstalled: boolean
  showInstallPrompt: boolean
  
  // Service Worker
  isUpdateAvailable: boolean
  isOfflineReady: boolean
  swRegistration: ServiceWorkerRegistration | null
  
  // Notificaciones
  notificationPermission: NotificationPermission
  pushSubscription: PushSubscription | null
  
  // Estado de conexión
  isOnline: boolean
}

interface PWAActions {
  // Instalación
  installPWA: () => Promise<boolean>
  dismissInstallPrompt: () => void
  
  // Service Worker
  updateSW: () => Promise<void>
  skipWaiting: () => void
  
  // Notificaciones
  requestNotificationPermission: () => Promise<NotificationPermission>
  subscribeToPush: () => Promise<PushSubscription | null>
  unsubscribeFromPush: () => Promise<boolean>
  sendTestNotification: (title: string, body: string) => void
  
  // Utilidades
  checkOnlineStatus: () => boolean
}

export const usePWA = (): PWAState & PWAActions => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    showInstallPrompt: false,
    isUpdateAvailable: false,
    isOfflineReady: false,
    swRegistration: null,
    notificationPermission: 'default',
    pushSubscription: null,
    isOnline: navigator.onLine
  })
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [wb, setWb] = useState<Workbox | null>(null)

  // Inicializar Workbox
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const workbox = new Workbox('/sw.js')
      setWb(workbox)

      // Service Worker listo para trabajar offline
      workbox.addEventListener('installed', (event) => {
        if (!event.isUpdate) {
          setState(prev => ({ ...prev, isOfflineReady: true }))
        }
      })

      // Nueva versión disponible
      workbox.addEventListener('waiting', () => {
        setState(prev => ({ ...prev, isUpdateAvailable: true }))
      })

      // Service Worker controlando la página
      workbox.addEventListener('controlling', () => {
        window.location.reload()
      })

      // Registrar service worker
      workbox.register().then((registration) => {
        setState(prev => ({ ...prev, swRegistration: registration }))
      })
    }
  }, [])

  // Detectar evento de instalación
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setState(prev => ({ 
        ...prev, 
        isInstallable: true,
        showInstallPrompt: !prev.isInstalled
      }))
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setState(prev => ({ 
        ...prev, 
        isInstalled: true,
        isInstallable: false,
        showInstallPrompt: false
      }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setState(prev => ({ ...prev, isInstalled: true }))
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Detectar cambios en el estado de conexión
  useEffect(() => {
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Verificar permisos de notificación al cargar
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
    if (state.swRegistration) {
      state.swRegistration.pushManager.getSubscription()
        .then(subscription => {
          setState(prev => ({ ...prev, pushSubscription: subscription }))
        })
        .catch(console.error)
    }
  }, [state.swRegistration])

  // Obtener clave pública VAPID del servidor
  const getVAPIDPublicKey = useCallback(async (): Promise<string> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action: 'get_vapid_key' })
      });
      
      if (!response.ok) {
        throw new Error('Error obteniendo clave VAPID');
      }
      
      const data = await response.json();
      return data.vapid_public_key;
    } catch (error) {
      console.error('Error obteniendo clave VAPID:', error);
      throw new Error('No se pudo obtener la clave VAPID del servidor');
    }
  }, []);
  const installPWA = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null)
        setState(prev => ({ 
          ...prev, 
          isInstallable: false,
          showInstallPrompt: false
        }))
        return true
      }
      return false
    } catch (error) {
      console.error('Error al instalar PWA:', error)
      return false
    }
  }, [deferredPrompt])

  const dismissInstallPrompt = useCallback(() => {
    setState(prev => ({ ...prev, showInstallPrompt: false }))
  }, [])

  // Acciones de Service Worker
  const updateSW = useCallback(async (): Promise<void> => {
    if (!wb) return
    
    try {
      await wb.messageSkipWaiting()
      setState(prev => ({ ...prev, isUpdateAvailable: false }))
    } catch (error) {
      console.error('Error al actualizar SW:', error)
    }
  }, [wb])

  const skipWaiting = useCallback(() => {
    if (!wb) return
    wb.messageSkipWaiting()
  }, [wb])

  // Acciones de notificaciones
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones')
      return 'denied'
    }

    const permission = await Notification.requestPermission()
    setState(prev => ({ ...prev, notificationPermission: permission }))
    return permission
  }, [])

  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!state.swRegistration || !('pushManager' in state.swRegistration)) {
      console.warn('Push messaging no está soportado')
      return null
    }

    try {
      // Obtener clave VAPID pública del servidor
      const vapidPublicKey = await getVAPIDPublicKey();
      
      const subscription = await state.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      })

      setState(prev => ({ ...prev, pushSubscription: subscription }))
      
      // Enviar suscripción al servidor (usando Supabase Edge Function)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/push-notifications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'subscribe',
          subscription,
          user_id: user?.id || 'anonymous'
        })
      })

      if (!response.ok) {
        throw new Error('Error registrando suscripción en el servidor');
      }

      const result = await response.json();
      console.log('Suscripción registrada exitosamente:', result);

      return subscription
    } catch (error) {
      console.error('Error al suscribirse a push:', error)
      return null
    }
  }, [state.swRegistration, getVAPIDPublicKey])

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!state.pushSubscription) return false

    try {
      await state.pushSubscription.unsubscribe()
      setState(prev => ({ ...prev, pushSubscription: null }))
      
      // Notificar al servidor (usando Supabase Edge Function)
      const response = await fetch('https://wilvxlbiktetduwftqfn.supabase.co/functions/v1/push-notifications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'unsubscribe',
          subscription: { endpoint: state.pushSubscription.endpoint }
        })
      })

      if (!response.ok) {
        console.warn('Error notificando desuscripción al servidor');
      }

      return true
    } catch (error) {
      console.error('Error al desuscribirse de push:', error)
      return false
    }
  }, [state.pushSubscription])

  const sendTestNotification = useCallback((title: string, body: string) => {
    if (state.notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test-notification',
        renotify: true
      })
    }
  }, [state.notificationPermission])

  // Utilidades
  const checkOnlineStatus = useCallback(() => navigator.onLine, [])

  return {
    ...state,
    installPWA,
    dismissInstallPrompt,
    updateSW,
    skipWaiting,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    checkOnlineStatus
  }
}