import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SearchResult } from '@/hooks/useAISearchReal'

export type ExportFormat = 'txt' | 'excel' | 'pdf'

export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeDetails?: boolean
}

export function useExportResults() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exportResults = async (results: SearchResult[], options: ExportOptions) => {
    if (!results || results.length === 0) {
      setError('No hay resultados para exportar')
      return false
    }

    if (!['txt', 'excel', 'pdf'].includes(options.format)) {
      setError('Formato de exportación no válido')
      return false
    }

    setIsExporting(true)
    setError(null)

    try {
      console.log('📤 Iniciando exportación:', { resultsCount: results.length, format: options.format })
      
      const { data, error: functionError } = await supabase.functions.invoke('export-search-results', {
        body: {
          results,
          format: options.format,
          filename: options.filename
        }
      })

      if (functionError) {
        console.error('❌ Error en función de exportación:', functionError)
        throw new Error(functionError.message || 'Error al exportar resultados')
      }

      if (data?.error) {
        console.error('❌ Error en data de exportación:', data.error)
        throw new Error(data.error.message || 'Error al exportar resultados')
      }

      // Si llegamos aquí, los datos deberían ser el archivo exportado
      console.log('✅ Exportación exitosa')
      
      // Crear enlace de descarga
      const blob = new Blob([data], { 
        type: getContentType(options.format) 
      })
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      const filename = options.filename || generateFilename(options.format)
      link.download = filename
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)

      return true
    } catch (err) {
      console.error('❌ Error en exportación:', err)
      setError(err instanceof Error ? err.message : 'Error al exportar resultados')
      return false
    } finally {
      setIsExporting(false)
    }
  }

  const exportResultsLocal = (results: SearchResult[], format: ExportFormat, filename?: string) => {
    // Fallback para exportación local sin Edge Function
    setIsExporting(true)
    setError(null)

    try {
      let content: string
      let mimeType: string
      let extension: string

      switch (format) {
        case 'txt':
          content = generateTextExport(results)
          mimeType = 'text/plain'
          extension = 'txt'
          break
        case 'excel':
          content = generateCSVExport(results)
          mimeType = 'text/csv'
          extension = 'csv'
          break
        case 'pdf':
          content = generateHTMLExport(results)
          mimeType = 'text/html'
          extension = 'html'
          break
        default:
          throw new Error('Formato no soportado')
      }

      const blob = new Blob([content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `convocatorias_${new Date().toISOString().split('T')[0]}.${extension}`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)

      return true
    } catch (err) {
      console.error('❌ Error en exportación local:', err)
      setError(err instanceof Error ? err.message : 'Error al exportar resultados')
      return false
    } finally {
      setIsExporting(false)
    }
  }

  return {
    isExporting,
    error,
    exportResults,
    exportResultsLocal,
    clearError: () => setError(null)
  }
}

// Funciones auxiliares
function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'txt':
      return 'text/plain; charset=utf-8'
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'pdf':
      return 'application/pdf'
    default:
      return 'text/plain'
  }
}

function generateFilename(format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0]
  const extension = format === 'excel' ? 'xlsx' : format
  return `convocatorias_${date}.${extension}`
}

function generateTextExport(results: SearchResult[]): string {
  let content = 'CONVOCATORIAS - REPORTE DE BÚSQUEDA\n'
  content += '='.repeat(50) + '\n\n'
  content += `Fecha de generación: ${new Date().toLocaleString('es-CL')}\n`
  content += `Total de convocatorias: ${results.length}\n\n`
  
  results.forEach((result, index) => {
    content += `${index + 1}. ${result.title || 'Sin título'}\n`
    content += '-'.repeat(30) + '\n'
    content += `Organización: ${result.validated_data?.organization || 'No especificada'}\n`
    content += `Descripción: ${result.description || 'Sin descripción'}\n`
    content += `Fecha límite: ${result.deadline || 'No especificada'}\n`
    content += `Monto: ${result.amount || 'No especificado'}\n`
    content += `Requisitos: ${result.requirements || 'No especificados'}\n`
    content += `Sitio web: ${result.source_url || 'No disponible'}\n`
    content += `Categoría: ${result.validated_data?.category || 'General'}\n`
    if (result.validated_data?.tags && result.validated_data.tags.length > 0) {
      content += `Etiquetas: ${result.validated_data.tags.join(', ')}\n`
    }
    content += '\n'
  })
  
  return content
}

function generateCSVExport(results: SearchResult[]): string {
  let csvContent = 'Título,Organización,Descripción,Fecha Límite,Monto,Requisitos,Sitio Web,Categoría,Etiquetas\n'
  
  results.forEach(result => {
    const row = [
      `"${(result.title || '').replace(/"/g, '""')}"`,
      `"${(result.validated_data?.organization || '').replace(/"/g, '""')}"`,
      `"${(result.description || '').replace(/"/g, '""')}"`,
      `"${result.deadline || ''}"`,
      `"${(result.amount || '').replace(/"/g, '""')}"`,
      `"${(result.requirements || '').replace(/"/g, '""')}"`,
      `"${result.source_url || ''}"`,
      `"${result.validated_data?.category || 'General'}"`,
      `"${result.validated_data?.tags ? result.validated_data.tags.join(', ') : ''}"`
    ]
    csvContent += row.join(',') + '\n'
  })
  
  return csvContent
}

function generateHTMLExport(results: SearchResult[]): string {
  let htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <title>Convocatorias - Reporte</title>
      <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2c3e50; border-bottom: 2px solid #3498db; }
          .convocatoria { margin-bottom: 25px; padding: 15px; border: 1px solid #ddd; }
          .title { font-size: 18px; font-weight: bold; color: #2c3e50; }
          .organization { font-size: 14px; color: #7f8c8d; margin-bottom: 10px; }
          .detail { margin: 5px 0; }
          .label { font-weight: bold; }
      </style>
  </head>
  <body>
      <h1>Convocatorias - Reporte de Búsqueda</h1>
      <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-CL')}</p>
      <p><strong>Total de convocatorias:</strong> ${results.length}</p>
      <hr>
  `
  
  results.forEach((result, index) => {
    htmlContent += `
    <div class="convocatoria">
        <div class="title">${index + 1}. ${result.title || 'Sin título'}</div>
        <div class="organization">${result.validated_data?.organization || 'Organización no especificada'}</div>
        <div class="detail"><span class="label">Descripción:</span> ${result.description || 'Sin descripción'}</div>
        <div class="detail"><span class="label">Fecha límite:</span> ${result.deadline || 'No especificada'}</div>
        <div class="detail"><span class="label">Monto:</span> ${result.amount || 'No especificado'}</div>
        <div class="detail"><span class="label">Requisitos:</span> ${result.requirements || 'No especificados'}</div>
        <div class="detail"><span class="label">Sitio web:</span> ${result.source_url || 'No disponible'}</div>
        <div class="detail"><span class="label">Categoría:</span> ${result.validated_data?.category || 'General'}</div>
        ${result.validated_data?.tags && result.validated_data.tags.length > 0 ? 
          `<div class="detail"><span class="label">Etiquetas:</span> ${result.validated_data.tags.join(', ')}</div>` : ''}
    </div>
    `
  })
  
  htmlContent += `
  </body>
  </html>
  `
  
  return htmlContent
}