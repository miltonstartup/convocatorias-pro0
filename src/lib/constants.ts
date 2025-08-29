// Constantes globales de la aplicación
export const APP_CONFIG = {
  name: 'ConvocatoriasPro',
  version: '1.0.0',
  description: 'Gestiona tus convocatorias de financiamiento con IA',
  url: import.meta.env.VITE_APP_URL || 'http://localhost:5173'
} as const

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
} as const

export const ROUTES = {
  // Públicas
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PLANS: '/plans',
  AUTH_CALLBACK: '/auth/callback',
  
  // Aplicación
  APP: '/app',
  DASHBOARD: '/app/dashboard',
  CALENDAR: '/app/calendar',
  HISTORY: '/app/history',
  EXPORT: '/app/export',
  
  // Configuración
  SETTINGS: '/app/settings',
  PROFILE: '/app/settings/profile',
  SUBSCRIPTION: '/app/settings/subscription',
  
  // Convocatorias
  CONVOCATORIAS_NEW: '/app/convocatorias/new',
  CONVOCATORIAS_NEW_AI: '/app/convocatorias/new-ai',
  CONVOCATORIAS_IMPORT: '/app/convocatorias/import',
  CONVOCATORIAS_PASTE: '/app/convocatorias/paste',
  CONVOCATORIAS_DETAIL: (id: string) => `/app/convocatorias/${id}`,
  
  // IA
  AI_SEARCH: '/app/ai-search',
  SAVED_SEARCHES: '/app/saved-searches',
  SAVED_CONVOCATORIAS: '/app/saved-convocatorias',
  AI_CONFIG: '/app/ai-config',
  PROMPT_EDITOR: '/app/prompt-editor'
} as const

export const PLAN_TYPES = {
  FREE: 'free',
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_annual'
} as const

export const CONVOCATORIA_ESTADOS = {
  ABIERTO: 'abierto',
  CERRADO: 'cerrado',
  EN_EVALUACION: 'en_evaluacion',
  FINALIZADO: 'finalizado'
} as const

export const AI_PROVIDERS = {
  OPENROUTER: 'openrouter',
  GEMINI: 'gemini',
  SMART_FLOW: 'smart_flow',
  GOOGLE_PSE_RAW: 'google_pse_raw'
} as const

export const PLAN_LIMITS = {
  FREE: {
    MAX_CONVOCATORIAS: 5,
    AI_FEATURES: false,
    EXPORT_FEATURES: false,
    ADVANCED_ANALYTICS: false
  },
  PRO: {
    MAX_CONVOCATORIAS: Infinity,
    AI_FEATURES: true,
    EXPORT_FEATURES: true,
    ADVANCED_ANALYTICS: true
  }
} as const

export const INSTITUCIONES_CHILE = [
  'CORFO',
  'SERCOTEC', 
  'ANID',
  'FOSIS',
  'MinCiencia',
  'Ministerio de Economía',
  'FIA',
  'CNCA',
  'CNTV',
  'Fondos de Cultura'
] as const

export const AREAS_FINANCIAMIENTO = [
  'Emprendimiento',
  'Innovación',
  'Cultura',
  'Investigación',
  'Tecnología',
  'Desarrollo Social',
  'Exportación',
  'Turismo',
  'Agricultura',
  'Energía'
] as const