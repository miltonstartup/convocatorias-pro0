import React from 'react'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

interface NotificationManagerProps {
  className?: string
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ className = '' }) => {
  const {
    notificationPermission,
    pushSubscription,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification
  } = usePWA()

  const [isLoading, setIsLoading] = React.useState(false)

  const handleEnableNotifications = async () => {
    setIsLoading(true)
    try {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        await subscribeToPush()
      }
    } catch (error) {
      console.error('Error al habilitar notificaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)
    try {
      await unsubscribeFromPush()
    } catch (error) {
      console.error('Error al deshabilitar notificaciones:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = () => {
    sendTestNotification(
      'ConvocatoriasPro',
      'Esta es una notificación de prueba. Las notificaciones están funcionando correctamente.'
    )
  }

  const isNotificationsEnabled = notificationPermission === 'granted' && pushSubscription

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {isNotificationsEnabled ? (
            <Bell className="h-5 w-5 text-green-600" />
          ) : (
            <BellOff className="h-5 w-5 text-gray-400" />
          )}
          <h3 className="text-lg font-medium text-gray-900">
            Notificaciones Push
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {isNotificationsEnabled && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Check className="h-3 w-3 mr-1" />
              Activas
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Recibe notificaciones sobre nuevas convocatorias, fechas límite próximas y actualizaciones importantes.
      </p>

      {notificationPermission === 'default' && (
        <div className="space-y-3">
          <button
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Bell className="h-4 w-4" />
            <span>
              {isLoading ? 'Habilitando...' : 'Habilitar Notificaciones'}
            </span>
          </button>
        </div>
      )}

      {notificationPermission === 'denied' && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <X className="h-4 w-4 text-red-600" />
            <p className="text-sm text-red-700">
              Las notificaciones están bloqueadas. Para habilitarlas, permite las notificaciones en la configuración de tu navegador.
            </p>
          </div>
        </div>
      )}

      {isNotificationsEnabled && (
        <div className="space-y-3">
          <div className="flex space-x-2">
            <button
              onClick={handleTestNotification}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Enviar Prueba
            </button>
            <button
              onClick={handleDisableNotifications}
              disabled={isLoading}
              className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deshabilitando...' : 'Deshabilitar'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Estado de las Notificaciones
        </h4>
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Permiso:</span>
            <span className="capitalize">{notificationPermission}</span>
          </div>
          <div className="flex justify-between">
            <span>Suscripción:</span>
            <span>{pushSubscription ? 'Activa' : 'Inactiva'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationManager