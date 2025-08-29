import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useTheme } from './useTheme'
import { toast } from 'sonner'

interface UserSettings {
  notifications_email: boolean
  notifications_browser: boolean
  notification_frequency: 'immediate' | 'daily' | 'weekly'
  alert_days_before: number
  language: string
  timezone: string
  theme: 'light' | 'dark' | 'system'
  default_export_format: 'csv' | 'pdf'
  ai_model_preference: 'standard' | 'advanced'
  ai_processing_level: 'basic' | 'detailed' | 'comprehensive'
  auto_save: boolean
  show_confidence_indicators: boolean
}

const defaultSettings: UserSettings = {
  notifications_email: true,
  notifications_browser: true,
  notification_frequency: 'daily',
  alert_days_before: 7,
  language: 'es',
  timezone: 'America/Santiago',
  theme: 'dark',
  default_export_format: 'csv',
  ai_model_preference: 'standard',
  ai_processing_level: 'detailed',
  auto_save: true,
  show_confidence_indicators: true
}

export function useSettings() {
  const { user } = useAuth()
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState<UserSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error)
        return
      }

      if (data?.settings) {
        const loadedSettings = { ...defaultSettings, ...data.settings }
        setSettings(loadedSettings)
        
        // Aplicar tema inmediatamente
        setTheme(loadedSettings.theme)
        
        // Aplicar otras configuraciones globales
        applyGlobalSettings(loadedSettings)
      } else {
        // Primera vez, aplicar configuraciones por defecto
        applyGlobalSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    setHasUnsavedChanges(true)
    
    // Aplicar algunos cambios inmediatamente
    if (key === 'theme') {
      setTheme(value as any)
    }
    
    // Auto-guardar si está habilitado
    if (settings.auto_save && key !== 'auto_save') {
      setTimeout(() => saveSettings(newSettings), 1000)
    }
  }

  const saveSettings = async (settingsToSave?: UserSettings) => {
    const finalSettings = settingsToSave || settings
    if (!user) return false

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          settings: finalSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      // Aplicar configuraciones globalmente
      applyGlobalSettings(finalSettings)
      setHasUnsavedChanges(false)
      
      // Registrar actividad
      await supabase.from('user_activity').insert({
        user_id: user.id,
        action: 'settings_updated',
        description: 'Configuración actualizada',
        metadata: { settings: Object.keys(finalSettings) }
      })
      
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error al guardar la configuración')
      return false
    }
  }

  const applyGlobalSettings = (settings: UserSettings) => {
    // Aplicar tema
    setTheme(settings.theme)
    
    // Configurar idioma (futuro)
    if (settings.language !== 'es') {
      // TODO: Implementar cambio de idioma
      console.log('Language change to:', settings.language)
    }
    
    // Configurar zona horaria
    if (settings.timezone) {
      // TODO: Aplicar zona horaria en formateo de fechas
      console.log('Timezone set to:', settings.timezone)
    }
    
    // Configurar notificaciones del navegador
    if (settings.notifications_browser && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Este navegador no soporta notificaciones')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        toast.success('Permisos de notificación concedidos')
        return true
      }
    }

    toast.error('Permisos de notificación denegados')
    return false
  }

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('ConvocatoriasPro', {
        body: 'Las notificaciones están funcionando correctamente',
        icon: '/favicon.ico'
      })
      toast.success('Notificación de prueba enviada')
    } else {
      toast.error('Permisos de notificación no concedidos')
    }
  }

  const resetToDefaults = async () => {
    setSettings(defaultSettings)
    applyGlobalSettings(defaultSettings)
    setHasUnsavedChanges(true)
    toast.success('Configuración restablecida a valores por defecto')
  }

  return {
    settings,
    isLoading,
    hasUnsavedChanges,
    updateSetting,
    saveSettings,
    requestNotificationPermission,
    testNotification,
    resetToDefaults
  }
}