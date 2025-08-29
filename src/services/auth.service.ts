// Servicio de autenticación centralizado
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export interface AuthCredentials {
  email: string
  password: string
  fullName?: string
}

export interface AuthResult {
  user?: User
  error?: Error
}

export class AuthService {
  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) {
        return { error: new Error(this.getAuthErrorMessage(error.message)) }
      }

      return { user: data.user }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async signUp(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName || credentials.email.split('@')[0]
          }
        }
      })

      if (error) {
        return { error: new Error(this.getAuthErrorMessage(error.message)) }
      }

      return { user: data.user }
    } catch (error) {
      return { error: error as Error }
    }
  }

  async signInWithProvider(provider: 'google' | 'github'): Promise<AuthResult> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        return { error: new Error(this.getAuthErrorMessage(error.message)) }
      }

      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  async signOut(): Promise<{ error?: Error }> {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { error: new Error(this.getAuthErrorMessage(error.message)) }
      }

      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  async updateProfile(updates: any): Promise<{ error?: Error }> {
    try {
      const user = await this.getCurrentUser()
      if (!user) {
        return { error: new Error('Usuario no autenticado') }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      if (error) {
        return { error: new Error(`Error al actualizar perfil: ${error.message}`) }
      }

      return {}
    } catch (error) {
      return { error: error as Error }
    }
  }

  private getAuthErrorMessage(errorMessage: string): string {
    const errorMap: { [key: string]: string } = {
      'Invalid login credentials': 'Credenciales incorrectas',
      'Email not confirmed': 'Email no confirmado',
      'User already registered': 'Este correo ya está registrado',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
      'Invalid email': 'Correo electrónico inválido'
    }

    return errorMap[errorMessage] || errorMessage
  }
}

// Instancia singleton
export const authService = new AuthService()