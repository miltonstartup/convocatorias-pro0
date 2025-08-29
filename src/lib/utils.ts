import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ConvocatoriaEstado } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function getDaysUntilDeadline(deadline: string): number {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function getEstadoColor(estado: ConvocatoriaEstado): string {
  switch (estado) {
    case 'abierto':
      return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
    case 'cerrado':
      return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800'
    case 'en_evaluacion':
      return 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800'
    case 'finalizado':
      return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-950 dark:border-slate-800'
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-950 dark:border-slate-800'
  }
}

export function getUrgencyColor(daysLeft: number): string {
  if (daysLeft < 0) {
    return 'text-red-600 dark:text-red-400' // Cerrado
  } else if (daysLeft <= 7) {
    return 'text-red-600 dark:text-red-400' // Urgente
  } else if (daysLeft <= 30) {
    return 'text-amber-600 dark:text-amber-400' // Próximo
  } else {
    return 'text-green-600 dark:text-green-400' // Bueno
  }
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function parseFileContent(content: string, filename: string): any[] {
  // Simulación de parsing inteligente para diferentes tipos de archivo
  const lines = content.split('\n').filter(line => line.trim() !== '')
  const convocatorias: any[] = []
  
  if (filename.endsWith('.csv')) {
    // Parsing CSV básico
    const headers = lines[0]?.split(',') || []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      const convocatoria: any = {}
      headers.forEach((header, index) => {
        convocatoria[header.trim().toLowerCase()] = values[index]?.trim() || ''
      })
      convocatorias.push(convocatoria)
    }
  } else {
    // Parsing de texto libre con IA simulada
    const chunks = content.split(/\n\s*\n/).filter(chunk => chunk.trim() !== '')
    
    chunks.forEach(chunk => {
      const convocatoria: any = {
        nombre_concurso: '',
        institucion: '',
        fecha_cierre: '',
        estado: 'abierto'
      }
      
      // Buscar patrones comunes
      const lines = chunk.split('\n')
      lines.forEach(line => {
        const lower = line.toLowerCase()
        
        if (lower.includes('convocatoria') || lower.includes('concurso') || lower.includes('fondo')) {
          convocatoria.nombre_concurso = line.trim()
        }
        
        if (lower.includes('corfo') || lower.includes('sercotec') || lower.includes('cultura')) {
          convocatoria.institucion = line.trim()
        }
        
        if (lower.includes('cierre') || lower.includes('plazo') || lower.includes('hasta')) {
          // Buscar fechas en el texto
          const dateMatch = line.match(/\d{1,2}[/-]\d{1,2}[/-]\d{4}/)
          if (dateMatch) {
            convocatoria.fecha_cierre = dateMatch[0]
          }
        }
        
        if (lower.includes('monto') || lower.includes('$') || lower.includes('pesos')) {
          convocatoria.monto_financiamiento = line.trim()
        }
      })
      
      if (convocatoria.nombre_concurso) {
        convocatorias.push(convocatoria)
      }
    })
  }
  
  return convocatorias
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isProPlan(plan: string): boolean {
  return plan === 'pro_monthly' || plan === 'pro_annual'
}

export function canAccessFeature(plan: string, feature: string): boolean {
  if (isProPlan(plan)) return true
  
  // Funciones disponibles en plan gratuito
  const freeFeatures = [
    'basic_dashboard',
    'manual_entry',
    'basic_calendar',
    'basic_filters'
  ]
  
  return freeFeatures.includes(feature)
}

export function getConvocatoriasLimit(plan: string): number {
  if (isProPlan(plan)) return Infinity
  return 5 // Límite para plan gratuito
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}