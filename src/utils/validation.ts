// Utilidades de validación centralizadas
import { z } from 'zod'

// Esquemas de validación
export const convocatoriaSchema = z.object({
  nombre_concurso: z.string().min(1, 'El nombre es requerido'),
  institucion: z.string().min(1, 'La institución es requerida'),
  fecha_apertura: z.string().optional(),
  fecha_cierre: z.string().min(1, 'La fecha de cierre es requerida'),
  fecha_resultados: z.string().optional(),
  estado: z.enum(['abierto', 'cerrado', 'en_evaluacion', 'finalizado']),
  tipo_fondo: z.string().min(1, 'El tipo de fondo es requerido'),
  area: z.string().min(1, 'El área es requerida'),
  requisitos: z.string().optional(),
  fuente: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  monto_financiamiento: z.string().optional(),
  notas_usuario: z.string().optional()
})

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
})

export const registerSchema = z.object({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
})

// Funciones de validación
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function validateDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start <= end
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover caracteres HTML básicos
    .substring(0, 1000) // Limitar longitud
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024
  return file.size <= maxSizeInBytes
}

// Tipos para TypeScript
export type ConvocatoriaFormData = z.infer<typeof convocatoriaSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>