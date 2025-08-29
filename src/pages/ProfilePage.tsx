import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import {
  User,
  Camera,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Shield,
  Upload,
  Check,
  AlertCircle,
  Crown,
  Activity,
  FileText,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePlans } from '@/hooks/usePlans'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface ProfileData {
  full_name?: string
  email?: string
  phone?: string
  organization?: string
  bio?: string
  website?: string
  location?: string
  avatar_url?: string
  public_profile?: boolean
}

interface ActivityItem {
  id: string
  action: string
  description: string
  created_at: string
  metadata?: any
}

export function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const { isProPlan, getCurrentPlan, getTrialDaysLeft, isTrialActive } = usePlans()
  const [profileData, setProfileData] = useState<ProfileData>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [statsData, setStatsData] = useState({
    total_convocatorias: 0,
    active_convocatorias: 0,
    completed_convocatorias: 0,
    ai_usage_count: 0,
    export_count: 0
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfileData()
    loadUserStats()
    loadRecentActivity()
  }, [user])

  const loadProfileData = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      
      // Cargar datos del perfil desde auth.users metadata y profiles table
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
        return
      }
      
      const userData = {
        full_name: user.user_metadata?.full_name || profileData?.full_name || '',
        email: user.email || '',
        phone: profileData?.phone || '',
        organization: profileData?.organization || '',
        bio: profileData?.bio || '',
        website: profileData?.website || '',
        location: profileData?.location || '',
        avatar_url: profileData?.avatar_url || user.user_metadata?.avatar_url || '',
        public_profile: profileData?.public_profile || false
      }
      
      setProfileData(userData)
    } catch (error) {
      console.error('Error loading profile data:', error)
      toast.error('Error al cargar los datos del perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUserStats = async () => {
    if (!user) return
    
    try {
      // Obtener estadísticas del usuario
      const [convocatorias, usage] = await Promise.all([
        supabase
          .from('convocatorias')
          .select('estado')
          .eq('user_id', user.id),
        supabase
          .from('user_activity')
          .select('action')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ])
      
      const convocatoriasData = convocatorias.data || []
      const usageData = usage.data || []
      
      setStatsData({
        total_convocatorias: convocatoriasData.length,
        active_convocatorias: convocatoriasData.filter(c => c.estado === 'abierto').length,
        completed_convocatorias: convocatoriasData.filter(c => c.estado === 'finalizado').length,
        ai_usage_count: usageData.filter(u => u.action.includes('ai_')).length,
        export_count: usageData.filter(u => u.action === 'export_data').length
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadRecentActivity = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      setRecentActivity(data || [])
    } catch (error) {
      console.error('Error loading activity:', error)
    }
  }

  const handleInputChange = (key: keyof ProfileData, value: string | boolean) => {
    setProfileData(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen')
      return
    }
    
    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB')
      return
    }
    
    try {
      setIsUploading(true)
      
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      const avatarUrl = urlData.publicUrl
      
      // Actualizar perfil con nueva URL del avatar
      await updateProfile({ avatar_url: avatarUrl })
      
      setProfileData(prev => ({ ...prev, avatar_url: avatarUrl }))
      toast.success('Avatar actualizado exitosamente')
      
      // Registrar actividad
      await supabase.from('user_activity').insert({
        user_id: user.id,
        action: 'avatar_updated',
        description: 'Avatar de perfil actualizado',
        metadata: { avatar_url: avatarUrl }
      })
      
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Error al subir el avatar')
    } finally {
      setIsUploading(false)
    }
  }

  const saveProfile = async () => {
    if (!user) return
    
    try {
      setIsSaving(true)
      
      // Actualizar en la tabla profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profileData.full_name,
          phone: profileData.phone,
          organization: profileData.organization,
          bio: profileData.bio,
          website: profileData.website,
          location: profileData.location,
          public_profile: profileData.public_profile,
          updated_at: new Date().toISOString()
        })
      
      if (profileError) throw profileError
      
      // Actualizar también en auth metadata para el nombre
      if (profileData.full_name !== user.user_metadata?.full_name) {
        await updateProfile({ full_name: profileData.full_name })
      }
      
      toast.success('Perfil actualizado exitosamente')
      setHasChanges(false)
      
      // Registrar actividad
      await supabase.from('user_activity').insert({
        user_id: user.id,
        action: 'profile_updated',
        description: 'Información del perfil actualizada'
      })
      
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Error al guardar el perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const currentPlan = getCurrentPlan()

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
            <p className="mt-4 text-muted-foreground">Cargando perfil...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y configuración de cuenta
          </p>
        </div>
        
        {hasChanges && (
          <Button onClick={saveProfile} disabled={isSaving}>
            {isSaving ? (
              <User className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="account">Cuenta</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Avatar y información básica */}
            <Card>
              <CardHeader>
                <CardTitle>Foto de Perfil</CardTitle>
                <CardDescription>
                  Tu imagen aparecerá en tu perfil y actividades
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profileData.avatar_url} alt="Avatar" />
                      <AvatarFallback className="text-lg">
                        {profileData.full_name ? getInitials(profileData.full_name) : 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Upload className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Formatos: JPG, PNG, GIF
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tamaño máximo: 5MB
                    </p>
                  </div>
                </div>
                
                {/* Plan actual */}
                <div className="text-center">
                  <Badge variant={isProPlan() ? 'default' : 'secondary'} className="mb-2">
                    {isProPlan() ? (
                      <Crown className="mr-1 h-3 w-3" />
                    ) : (
                      <Shield className="mr-1 h-3 w-3" />
                    )}
                    Plan {isProPlan() ? 'Pro' : 'Gratuito'}
                  </Badge>
                  
                  {isTrialActive() && (
                    <p className="text-xs text-muted-foreground">
                      Prueba: {getTrialDaysLeft()} días restantes
                    </p>
                  )}
                  
                  {currentPlan && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentPlan.name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Información personal */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Información Personal</CardTitle>
                  <CardDescription>
                    Datos básicos de tu perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre completo</Label>
                      <Input
                        id="full_name"
                        value={profileData.full_name || ''}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email || ''}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        El email no se puede cambiar
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={profileData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+56 9 1234 5678"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input
                        id="location"
                        value={profileData.location || ''}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        placeholder="Santiago, Chile"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organization">Organización</Label>
                    <Input
                      id="organization"
                      value={profileData.organization || ''}
                      onChange={(e) => handleInputChange('organization', e.target.value)}
                      placeholder="Empresa, universidad, institución..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Sitio web</Label>
                    <Input
                      id="website"
                      value={profileData.website || ''}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://tuempresa.com"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Biografía */}
              <Card>
                <CardHeader>
                  <CardTitle>Biografía</CardTitle>
                  <CardDescription>
                    Cuéntanos sobre ti y tu trabajo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={profileData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Escribe una breve descripción sobre ti, tu trabajo, intereses profesionales..."
                    className="min-h-[100px] resize-y"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(profileData.bio || '').length}/500 caracteres
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Cuenta */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Información de Cuenta
              </CardTitle>
              <CardDescription>
                Detalles de tu cuenta y suscripción
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Email de la cuenta</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user?.email}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Fecha de registro</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {user?.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: es }) : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Plan actual</Label>
                  <div className="flex items-center gap-2">
                    {isProPlan() ? <Crown className="h-4 w-4 text-yellow-500" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm">
                      {isProPlan() ? 'Plan Pro' : 'Plan Gratuito'}
                    </span>
                    {isTrialActive() && (
                      <Badge variant="outline" className="text-xs">
                        Prueba: {getTrialDaysLeft()}d
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>ID de usuario</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {user?.id?.slice(0, 8)}...
                    </code>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Estadísticas de uso */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{statsData.total_convocatorias}</div>
                  <div className="text-xs text-muted-foreground">Total Convocatorias</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Activity className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{statsData.active_convocatorias}</div>
                  <div className="text-xs text-muted-foreground">Activas</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Check className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{statsData.completed_convocatorias}</div>
                  <div className="text-xs text-muted-foreground">Completadas</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Crown className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{statsData.ai_usage_count}</div>
                  <div className="text-xs text-muted-foreground">Uso de IA</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <Download className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{statsData.export_count}</div>
                  <div className="text-xs text-muted-foreground">Exportaciones</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actividad */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Actividad Reciente
              </CardTitle>
              <CardDescription>
                Últimas acciones realizadas en tu cuenta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="mt-1">
                        {activity.action.includes('ai_') && <Crown className="h-4 w-4 text-yellow-500" />}
                        {activity.action.includes('export') && <Download className="h-4 w-4 text-blue-500" />}
                        {activity.action.includes('profile') && <User className="h-4 w-4 text-green-500" />}
                        {activity.action.includes('convocatoria') && <FileText className="h-4 w-4 text-purple-500" />}
                        {!['ai_', 'export', 'profile', 'convocatoria'].some(type => activity.action.includes(type)) && 
                         <Activity className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay actividad reciente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacidad */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {profileData.public_profile ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                Configuración de Privacidad
              </CardTitle>
              <CardDescription>
                Controla la visibilidad de tu perfil y datos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Perfil público</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que otros usuarios vean tu información de perfil
                  </p>
                </div>
                <Button
                  variant={profileData.public_profile ? "default" : "outline"}
                  onClick={() => handleInputChange('public_profile', !profileData.public_profile)}
                >
                  {profileData.public_profile ? (
                    <><Eye className="mr-2 h-4 w-4" /> Público</>
                  ) : (
                    <><EyeOff className="mr-2 h-4 w-4" /> Privado</>
                  )}
                </Button>
              </div>
              
              <Separator />
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Tu privacidad es importante:</strong> Solo compartes la información que eliges hacer pública.
                  Tu email y datos personales siempre permanecen privados.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}