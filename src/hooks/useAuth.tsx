import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { authService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase' 
import { PlanType } from '@/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: any | null
  plan: PlanType
  isPro: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signInWithGithub: () => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: any) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await fetchProfile(session.user.id)
          }
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación (SIN operaciones asíncronas)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔑 Auth State Change:', event, !!session?.user)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        // Solo limpiar profile en logout - fetchProfile se maneja en useEffect
        if (event === 'SIGNED_OUT') {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Manejar fetchProfile cuando el usuario cambie (fuera del callback de auth)
  useEffect(() => {
    const loadProfile = async () => {
      if (user && !profile) {
        console.log('📄 Fetching profile for user:', user.email)
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error)
            return
          }

          if (data) {
            setProfile(data)
          } else {
            // Crear perfil si no existe
            const { data: newProfile, error: createError } = await supabase.rpc('ensure_profile_exists')
            if (!createError && newProfile) {
              setProfile(newProfile)
            }
          }
        } catch (error) {
          console.error('Error loading profile:', error)
        }
      }
    }

    loadProfile()
  }, [user?.id, profile])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return
      }

      if (data) {
        setProfile(data)
      } else {
        // Crear perfil si no existe
        await createProfile(userId)
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error)
    }
  }

  const createProfile = async (userId: string) => {
    try {
      // Usar función simplificada que no falla
      const { data, error } = await supabase.rpc('ensure_profile_exists')

      if (error) {
        console.error('Error ensuring profile:', error)
        // Si falla, intentar crear manualmente sin fallar
        try {
          const { data: manualProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle()
          
          if (manualProfile) {
            setProfile(manualProfile)
          }
        } catch (e) {
          console.error('Manual profile fetch failed:', e)
        }
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error in createProfile:', error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const result = await authService.signIn({ email, password })
    return { error: result.error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const result = await authService.signUp({ email, password, fullName })
    return { error: result.error }
  }

  const signInWithGoogle = async () => {
    const result = await authService.signInWithProvider('google')
    return { error: result.error }
  }

  const signInWithGithub = async () => {
    const result = await authService.signInWithProvider('github')
    return { error: result.error }
  }

  const signOut = async () => {
    console.log('🚑 Signing out user')
    
    const result = await authService.signOut()
    return { error: result.error }
  }

  const updateProfile = async (updates: any) => {
    if (!user) return { error: new Error('Usuario no autenticado') }

    const result = await authService.updateProfile(updates)
    
    if (!result.error) {
      // Refrescar perfil después de actualización exitosa
      await refreshProfile()
    }
    
    return result
  }

  const refreshProfile = async () => {
    if (!user) return
    await fetchProfile(user.id)
  }

  // Calcular plan e isPro - considerar ambas fuentes y priorizar cualquier plan Pro
  const planFromMeta = user?.user_metadata?.plan;
  const planFromProfile = profile?.plan;
  
  // Priorizar cualquier plan Pro de cualquier fuente
  const plan: PlanType = (planFromMeta === 'pro_monthly' || planFromMeta === 'pro_annual') 
    ? planFromMeta 
    : (planFromProfile === 'pro_monthly' || planFromProfile === 'pro_annual')
      ? planFromProfile
      : planFromProfile || planFromMeta || 'free';
      
  const isPro = plan === 'pro_monthly' || plan === 'pro_annual'
  
  // Logging para debugging
  console.log('🔍 Auth Debug:', {
    user: !!user,
    userEmail: user?.email,
    profile: !!profile,
    planFromProfile: profile?.plan,
    planFromMeta: user?.user_metadata?.plan,
    calculatedPlan: plan,
    isPro: isPro,
    userMetadata: user?.user_metadata
  })

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      profile,
      plan,
      isPro,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithGithub,
      signOut,
      updateProfile,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}
