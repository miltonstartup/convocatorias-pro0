export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  plan: PlanType
  plan_expires_at?: string
  trial_ends_at?: string
  created_at: string
  updated_at: string
}

export type PlanType = 'free' | 'pro_monthly' | 'pro_annual'

export interface Plan {
  id: string
  name: string
  price_clp: number
  mp_checkout_url: string | null
  max_convocatorias: number
  features: string[]
  created_at: string
}

export interface Convocatoria {
  id: number
  user_id: string
  nombre_concurso: string
  institucion?: string
  fecha_apertura?: string
  fecha_cierre: string
  fecha_resultados?: string
  estado: ConvocatoriaEstado
  tipo_fondo?: string
  area?: string
  requisitos?: any
  fuente?: string
  monto_financiamiento?: string
  notas_usuario?: string
  created_at: string
  updated_at: string
}

export type ConvocatoriaEstado = 'abierto' | 'cerrado' | 'en_evaluacion' | 'finalizado'

export interface ConvocatoriaForm {
  nombre_concurso: string
  institucion: string
  fecha_apertura?: string
  fecha_cierre: string
  fecha_resultados?: string
  estado: ConvocatoriaEstado
  tipo_fondo: string
  area: string
  requisitos?: string
  fuente?: string
  monto_financiamiento?: string
  notas_usuario?: string
}

export interface DashboardFilters {
  estado?: ConvocatoriaEstado | 'todos'
  institucion?: string
  tipo_fondo?: string
  search?: string
}

export interface DashboardStats {
  total: number
  abiertas: number
  cerradas: number
  en_evaluacion: number
  proximas_a_cerrar: number
}

export interface RastreoAutomatico {
  id: number
  user_id: string
  institucion: string
  url_fuente: string
  keywords: string[]
  ultimo_rastreo?: string
  convocatorias_encontradas: number
  is_active: boolean
  created_at: string
}

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface CalendarEvent {
  id: number
  title: string
  date: string
  type: 'apertura' | 'cierre' | 'resultados'
  convocatoria: Convocatoria
}

export interface ParsedFileData {
  convocatorias: Partial<ConvocatoriaForm>[]
  errors: string[]
  success: boolean
}