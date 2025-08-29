import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para la base de datos
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          plan: 'free' | 'pro_monthly' | 'pro_annual'
          plan_expires_at: string | null
          trial_ends_at: string | null
          convocatorias_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          plan?: 'free' | 'pro_monthly' | 'pro_annual'
          plan_expires_at?: string | null
          trial_ends_at?: string | null
          convocatorias_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          plan?: 'free' | 'pro_monthly' | 'pro_annual'
          plan_expires_at?: string | null
          trial_ends_at?: string | null
          convocatorias_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      convocatorias: {
        Row: {
          id: number
          user_id: string
          nombre_concurso: string
          institucion: string | null
          fecha_apertura: string | null
          fecha_cierre: string
          fecha_resultados: string | null
          estado: 'abierto' | 'cerrado' | 'en_evaluacion' | 'finalizado'
          tipo_fondo: string | null
          area: string | null
          requisitos: any | null
          fuente: string | null
          monto_financiamiento: string | null
          notas_usuario: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          nombre_concurso: string
          institucion?: string | null
          fecha_apertura?: string | null
          fecha_cierre: string
          fecha_resultados?: string | null
          estado?: 'abierto' | 'cerrado' | 'en_evaluacion' | 'finalizado'
          tipo_fondo?: string | null
          area?: string | null
          requisitos?: any | null
          fuente?: string | null
          monto_financiamiento?: string | null
          notas_usuario?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          nombre_concurso?: string
          institucion?: string | null
          fecha_apertura?: string | null
          fecha_cierre?: string
          fecha_resultados?: string | null
          estado?: 'abierto' | 'cerrado' | 'en_evaluacion' | 'finalizado'
          tipo_fondo?: string | null
          area?: string | null
          requisitos?: any | null
          fuente?: string | null
          monto_financiamiento?: string | null
          notas_usuario?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          price_clp: number
          max_convocatorias: number
          mp_checkout_url: string | null
          features: any | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          price_clp: number
          max_convocatorias?: number
          mp_checkout_url?: string | null
          features?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price_clp?: number
          max_convocatorias?: number
          mp_checkout_url?: string | null
          features?: any | null
          created_at?: string
        }
      }
    }
  }
}