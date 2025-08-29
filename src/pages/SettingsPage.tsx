import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { NotificationManager } from '@/components/ui/NotificationManager'
import { 
  Settings, 
  Bell, 
  Globe, 
  Palette, 
  Download, 
  Bot, 
  Mail,
  Clock,
  Calendar,
  FileText,
  Sparkles,
  AlertCircle,
  Check,
  TestTube,
  RotateCcw,
  Zap,
  Smartphone,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { usePWA } from '@/hooks/usePWA'
import { toast } from 'sonner'

export function SettingsPage() {
  const { profile } = useAuth()
  const { isProPlan } = usePlans()
  const { theme, actualTheme } = useTheme()
  const {
    settings,
    isLoading,
    hasUnsavedChanges,
    updateSetting,
    saveSettings,
    requestNotificationPermission,
    testNotification,
    resetToDefaults
  } = useSettings()
  
  // PWA hooks
  const {
    isInstallable,
    isInstalled,
    installPWA,
    isUpdateAvailable,
    updateSW,
    isOnline,
    isOfflineReady
  } = usePWA()

  const handleSaveSettings = async () => {
    const success = await saveSettings()
    if (success) {
      toast.success('Configuración guardada exitosamente')
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground animate-spin" />
            <p className="mt-4 text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Personaliza tu experiencia en ConvocatoriasPro
          </p>
        </div>
        
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              size="sm"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restablecer
            </Button>
            <Button 
              onClick={handleSaveSettings} 
              disabled={isLoading}
            >
              {isLoading ? (
                <Settings className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="pwa">PWA</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          <TabsTrigger value="export">Exportación</TabsTrigger>
          <TabsTrigger value="ai">Inteligencia Artificial</TabsTrigger>
          <TabsTrigger value="advanced">Avanzado</TabsTrigger>
        </TabsList>

        {/* Notificaciones */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
              <CardDescription>
                Configura cómo y cuándo recibir notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Notificaciones por email</Label>
                  <Switch
                    checked={settings.notifications_email}
                    onCheckedChange={(value) => updateSetting('notifications_email', value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Recibe alertas de vencimientos por correo electrónico
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Notificaciones del navegador</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.notifications_browser}
                      onCheckedChange={(value) => {
                        updateSetting('notifications_browser', value)
                        if (value) {
                          requestNotificationPermission()
                        }
                      }}
                    />
                    {settings.notifications_browser && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={testNotification}
                      >
                        <TestTube className="mr-1 h-3 w-3" />
                        Probar
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Mostrar notificaciones push en el navegador
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Frecuencia de notificaciones</Label>
                <Select 
                  value={settings.notification_frequency} 
                  onValueChange={(value: any) => updateSetting('notification_frequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Inmediata</SelectItem>
                    <SelectItem value="daily">Diaria</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Días de aviso antes del vencimiento</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.alert_days_before}
                    onChange={(e) => updateSetting('alert_days_before', parseInt(e.target.value) || 7)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">días</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PWA */}
        <TabsContent value="pwa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Progressive Web App (PWA)
              </CardTitle>
              <CardDescription>
                Gestiona las características de aplicación web progresiva
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Estado de Instalación */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Estado de Instalación</h4>
                    <p className="text-sm text-muted-foreground">
                      {isInstalled 
                        ? 'ConvocatoriasPro está instalada como aplicación'
                        : isInstallable 
                          ? 'ConvocatoriasPro se puede instalar como aplicación'
                          : 'La instalación no está disponible en este momento'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isInstalled ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="mr-1 h-3 w-3" />
                        Instalada
                      </Badge>
                    ) : isInstallable ? (
                      <>
                        <Badge variant="outline">
                          Disponible
                        </Badge>
                        <Button
                          onClick={async () => {
                            const success = await installPWA()
                            if (success) {
                              toast.success('PWA instalada exitosamente')
                            }
                          }}
                          size="sm"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Instalar
                        </Button>
                      </>
                    ) : (
                      <Badge variant="secondary">No disponible</Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Estado de Actualización */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Actualizaciones</h4>
                    <p className="text-sm text-muted-foreground">
                      {isUpdateAvailable 
                        ? 'Nueva versión disponible'
                        : 'La aplicación está actualizada'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpdateAvailable ? (
                      <>
                        <Badge className="bg-blue-100 text-blue-800">
                          Actualización disponible
                        </Badge>
                        <Button
                          onClick={async () => {
                            await updateSW()
                            toast.success('Actualización aplicada')
                          }}
                          size="sm"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Actualizar
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="mr-1 h-3 w-3" />
                        Actualizada
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Estado de Conexión */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Estado de Conexión</h4>
                    <p className="text-sm text-muted-foreground">
                      {isOnline 
                        ? 'Conectado a internet'
                        : isOfflineReady 
                          ? 'Sin conexión - Modo offline disponible'
                          : 'Sin conexión - Funcionalidad limitada'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Wifi className="mr-1 h-3 w-3" />
                        En línea
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-100 text-orange-800">
                        <WifiOff className="mr-1 h-3 w-3" />
                        Sin conexión
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notificaciones Push */}
              <NotificationManager className="" />

              <Separator />

              {/* Información adicional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Características PWA</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Instalación como aplicación nativa</li>
                  <li>• Funcionamiento sin conexión</li>
                  <li>• Notificaciones push en tiempo real</li>
                  <li>• Actualizaciones automáticas</li>
                  <li>• Acceso rápido desde la pantalla de inicio</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Configuración General
              </CardTitle>
              <CardDescription>
                Idioma, zona horaria y preferencias básicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Idioma</Label>
                  <Select 
                    value={settings.language} 
                    onValueChange={(value) => updateSetting('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label>Zona horaria</Label>
                  <Select 
                    value={settings.timezone} 
                    onValueChange={(value) => updateSetting('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona zona horaria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Santiago">Santiago (GMT-3)</SelectItem>
                      <SelectItem value="America/Buenos_Aires">Buenos Aires (GMT-3)</SelectItem>
                      <SelectItem value="America/Lima">Lima (GMT-5)</SelectItem>
                      <SelectItem value="America/Bogota">Bogotá (GMT-5)</SelectItem>
                      <SelectItem value="America/Mexico_City">Ciudad de México (GMT-6)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Guardado automático</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.auto_save}
                      onCheckedChange={(value) => updateSetting('auto_save', value)}
                    />
                    {settings.auto_save && (
                      <Badge variant="outline" className="text-xs">
                        <Zap className="mr-1 h-3 w-3" />
                        Activo
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Guarda cambios automáticamente mientras trabajas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apariencia */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Apariencia
              </CardTitle>
              <CardDescription>
                Personaliza la apariencia de la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Tema de la aplicación</Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(value: any) => updateSetting('theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-white border border-gray-300"></div>
                        Claro
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-900"></div>
                        Oscuro
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-white to-gray-900 border border-gray-300"></div>
                        Sistema
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Tema actual: <span className="font-medium">{actualTheme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  {settings.theme === 'system' && ' (automático)'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exportación */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exportación
              </CardTitle>
              <CardDescription>
                Configura las opciones de exportación de datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Formato de exportación por defecto</Label>
                <Select 
                  value={settings.default_export_format} 
                  onValueChange={(value: any) => updateSetting('default_export_format', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Excel compatible)</SelectItem>
                    <SelectItem value="pdf">PDF (Documento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!isProPlan() && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Funcionalidad Pro:</strong> La exportación avanzada está disponible solo para usuarios con Plan Pro.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* IA */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Inteligencia Artificial
                {isProPlan() && <Badge className="ml-2">PRO</Badge>}
              </CardTitle>
              <CardDescription>
                Configura las funciones de IA según tus preferencias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isProPlan() ? (
                <>
                  <div className="space-y-3">
                    <Label>Modelo de IA preferido</Label>
                    <Select 
                      value={settings.ai_model_preference} 
                      onValueChange={(value: any) => updateSetting('ai_model_preference', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Estándar (Rápido)</SelectItem>
                        <SelectItem value="advanced">Avanzado (Más preciso)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Nivel de procesamiento</Label>
                    <Select 
                      value={settings.ai_processing_level} 
                      onValueChange={(value: any) => updateSetting('ai_processing_level', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Básico</SelectItem>
                        <SelectItem value="detailed">Detallado</SelectItem>
                        <SelectItem value="comprehensive">Comprehensivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Mostrar indicadores de confianza</Label>
                      <p className="text-sm text-muted-foreground">
                        Muestra el nivel de certeza de la IA en los resultados
                      </p>
                    </div>
                    <Switch
                      checked={settings.show_confidence_indicators}
                      onCheckedChange={(value) => updateSetting('show_confidence_indicators', value)}
                    />
                  </div>
                </>
              ) : (
                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Plan Pro requerido:</strong> Las funciones de IA están disponibles solo para usuarios con Plan Pro. 
                    <Button variant="link" className="px-0 h-auto font-semibold" asChild>
                      <a href="/app/plans">Actualizar plan</a>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avanzado */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración Avanzada
              </CardTitle>
              <CardDescription>
                Opciones avanzadas para usuarios expertos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Advertencia:</strong> Estas configuraciones son para usuarios avanzados. 
                  Cambiarlas incorrectamente puede afectar el funcionamiento de la aplicación.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4 opacity-75">
                <p className="text-sm text-muted-foreground">
                  Las opciones avanzadas estarán disponibles en futuras versiones.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}