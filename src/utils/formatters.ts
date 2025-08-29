// Utilidades de formateo centralizadas
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export class DateFormatter {
  static format(date: string | Date, pattern: string = 'dd/MM/yyyy'): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      return format(dateObj, pattern, { locale: es })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Fecha inválida'
    }
  }

  static formatLong(date: string | Date): string {
    return this.format(date, 'dd \'de\' MMMM \'de\' yyyy')
  }

  static formatShort(date: string | Date): string {
    return this.format(date, 'dd/MM/yy')
  }

  static formatRelative(date: string | Date): string {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      return formatDistanceToNow(dateObj, { addSuffix: true, locale: es })
    } catch (error) {
      console.error('Error formatting relative date:', error)
      return 'Fecha inválida'
    }
  }

  static getDaysUntil(date: string | Date): number {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      const now = new Date()
      const diffTime = dateObj.getTime() - now.getTime()
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    } catch (error) {
      console.error('Error calculating days until:', error)
      return 0
    }
  }
}

export class CurrencyFormatter {
  static formatCLP(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  static formatNumber(number: number): string {
    return new Intl.NumberFormat('es-CL').format(number)
  }

  static parseAmount(amountString: string): number | null {
    try {
      // Remover caracteres no numéricos excepto puntos y comas
      const cleaned = amountString.replace(/[^\d.,]/g, '')
      const number = parseFloat(cleaned.replace(',', '.'))
      return isNaN(number) ? null : number
    } catch {
      return null
    }
  }
}

export class TextFormatter {
  static truncate(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  }

  static slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
      .replace(/[\s_-]+/g, '-') // Reemplazar espacios con guiones
      .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
  }

  static cleanHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim()
  }

  static extractKeywords(text: string, maxKeywords: number = 5): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)

    // Contar frecuencia de palabras
    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    // Ordenar por frecuencia y tomar las más comunes
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word)
  }
}

export class StatusFormatter {
  static getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'abierto': 'Abierto',
      'cerrado': 'Cerrado',
      'en_evaluacion': 'En Evaluación',
      'finalizado': 'Finalizado'
    }
    return labels[estado] || estado
  }

  static getEstadoColor(estado: string): string {
    const colors: { [key: string]: string } = {
      'abierto': 'text-green-600 bg-green-50 border-green-200',
      'cerrado': 'text-red-600 bg-red-50 border-red-200',
      'en_evaluacion': 'text-amber-600 bg-amber-50 border-amber-200',
      'finalizado': 'text-slate-600 bg-slate-50 border-slate-200'
    }
    return colors[estado] || 'text-slate-600 bg-slate-50 border-slate-200'
  }

  static getUrgencyColor(daysLeft: number): string {
    if (daysLeft < 0) return 'text-red-600'
    if (daysLeft <= 7) return 'text-red-600'
    if (daysLeft <= 30) return 'text-amber-600'
    return 'text-green-600'
  }

  static getPriorityLabel(daysLeft: number): string {
    if (daysLeft < 0) return 'Vencida'
    if (daysLeft <= 7) return 'Urgente'
    if (daysLeft <= 30) return 'Próxima'
    return 'Normal'
  }
}