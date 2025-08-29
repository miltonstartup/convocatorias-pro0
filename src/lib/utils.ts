import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { DateFormatter, StatusFormatter, TextFormatter } from '@/utils/formatters'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-exportar funciones de formateo para compatibilidad
export function formatDate(date: string | Date): string {
  return DateFormatter.formatLong(date)
}

export function formatDateShort(date: string | Date): string {
  return DateFormatter.formatShort(date)
}

export { CurrencyFormatter as formatCurrency } from '@/utils/formatters'

export function getDaysUntilDeadline(deadline: string): number {
  return DateFormatter.getDaysUntil(deadline)
}

export function getEstadoColor(estado: string): string {
  return StatusFormatter.getEstadoColor(estado)
}

export function getUrgencyColor(daysLeft: number): string {
  return StatusFormatter.getUrgencyColor(daysLeft)
}

export function truncateText(text: string, maxLength: number = 100): string {
  return TextFormatter.truncate(text, maxLength)
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}