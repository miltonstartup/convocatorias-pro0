// Edge Function: export-data
// Sistema de exportación premium con formatos PDF y CSV profesionales

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ExportRequest {
  format: 'csv' | 'pdf'
  filters?: {
    status?: string
    organization?: string
    category?: string
    date_from?: string
    date_to?: string
    search?: string
  }
  options?: {
    include_description?: boolean
    include_requirements?: boolean
    sort_by?: 'date' | 'name' | 'institution'
    sort_order?: 'asc' | 'desc'
  }
}

interface ConvocatoriaExport {
  id: string
  nombre_concurso: string
  institucion: string
  fecha_cierre: string
  fecha_apertura?: string
  fecha_resultados?: string
  estado: string
  monto_financiamiento?: string
  area?: string
  tipo_fondo?: string
  descripcion?: string
  requisitos?: string
  contacto?: string
  sitio_web?: string
  created_at: string
  updated_at: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function generateCSV(data: ConvocatoriaExport[], options: any = {}): string {
  if (data.length === 0) {
    return 'No hay datos para exportar'
  }

  // Headers del CSV
  const headers = [
    'ID',
    'Nombre del Concurso',
    'Institución',
    'Fecha de Cierre',
    'Fecha de Apertura',
    'Fecha de Resultados',
    'Estado',
    'Monto de Financiamiento',
    'Área',
    'Tipo de Fondo',
    'Contacto',
    'Sitio Web',
    'Fecha de Creación',
    'Fecha de Actualización'
  ]

  if (options.include_description) {
    headers.push('Descripción')
  }
  if (options.include_requirements) {
    headers.push('Requisitos')
  }

  let csv = headers.join(',') + '\n'

  // Datos
  data.forEach(row => {
    const values = [
      row.id,
      `"${(row.nombre_concurso || '').replace(/"/g, '""')}"`,
      `"${(row.institucion || '').replace(/"/g, '""')}"`,
      row.fecha_cierre || '',
      row.fecha_apertura || '',
      row.fecha_resultados || '',
      row.estado || '',
      `"${(row.monto_financiamiento || '').replace(/"/g, '""')}"`,
      `"${(row.area || '').replace(/"/g, '""')}"`,
      `"${(row.tipo_fondo || '').replace(/"/g, '""')}"`,
      `"${(row.contacto || '').replace(/"/g, '""')}"`,
      row.sitio_web || '',
      row.created_at,
      row.updated_at
    ]

    if (options.include_description) {
      values.push(`"${(row.descripcion || '').replace(/"/g, '""')}"`)
    }
    if (options.include_requirements) {
      values.push(`"${(row.requisitos || '').replace(/"/g, '""')}"`)
    }

    csv += values.join(',') + '\n'
  })

  return csv
}

function generatePDF(data: ConvocatoriaExport[], options: any = {}): string {
  const now = new Date().toLocaleString('es-CL')
  const totalConvocatorias = data.length
  
  let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reporte ConvocatoriasPro</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .meta-info {
            background-color: #F8FAFC;
            padding: 15px;
            border-left: 4px solid #3B82F6;
            margin-bottom: 30px;
        }
        .meta-info h3 {
            margin-top: 0;
            color: #1E40AF;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 12px;
        }
        th {
            background-color: #3B82F6;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 10px 8px;
            border-bottom: 1px solid #E5E7EB;
            vertical-align: top;
        }
        tr:nth-child(even) {
            background-color: #F9FAFB;
        }
        .status {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 500;
            text-transform: uppercase;
        }
        .status.abierto {
            background-color: #D1FAE5;
            color: #065F46;
        }
        .status.cerrado {
            background-color: #FEE2E2;
            color: #991B1B;
        }
        .status.en_evaluacion {
            background-color: #FEF3C7;
            color: #92400E;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            color: #6B7280;
            font-size: 12px;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">ConvocatoriasPro</div>
        <div class="subtitle">Reporte de Convocatorias</div>
    </div>
    
    <div class="meta-info">
        <h3>Información del Reporte</h3>
        <p><strong>Fecha de generación:</strong> ${now}</p>
        <p><strong>Total de convocatorias:</strong> ${totalConvocatorias}</p>
        <p><strong>Formato:</strong> PDF Profesional</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Convocatoria</th>
                <th>Institución</th>
                <th>Fecha Cierre</th>
                <th>Estado</th>
                <th>Monto</th>
                <th>Área</th>
            </tr>
        </thead>
        <tbody>
`

  data.forEach((conv, index) => {
    html += `
            <tr>
                <td><strong>${conv.nombre_concurso || 'Sin nombre'}</strong></td>
                <td>${conv.institucion || 'N/A'}</td>
                <td>${conv.fecha_cierre || 'N/A'}</td>
                <td><span class="status ${conv.estado || 'sin_estado'}">${conv.estado || 'Sin estado'}</span></td>
                <td>${conv.monto_financiamiento || 'No especificado'}</td>
                <td>${conv.area || 'N/A'}</td>
            </tr>`
    
    // Agregar descripción si se solicita
    if (options.include_description && conv.descripcion) {
      html += `
            <tr>
                <td colspan="6" style="background-color: #F3F4F6; font-style: italic; padding: 8px;">
                    <strong>Descripción:</strong> ${conv.descripcion}
                </td>
            </tr>`
    }
    
    // Agregar requisitos si se solicita
    if (options.include_requirements && conv.requisitos) {
      html += `
            <tr>
                <td colspan="6" style="background-color: #FEF7FF; font-size: 11px; padding: 8px;">
                    <strong>Requisitos:</strong> ${conv.requisitos}
                </td>
            </tr>`
    }
  })

  html += `
        </tbody>
    </table>
    
    <div class="footer">
        <p>Generado por ConvocatoriasPro - Sistema de Gestión de Convocatorias</p>
        <p>Reporte confidencial - Solo para uso del titular de la cuenta</p>
    </div>
</body>
</html>`

  return html
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: corsHeaders }
    )
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Token de autorización requerido')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Token inválido')
    }

    // Verificar plan del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    const { format, filters = {}, options = {} }: ExportRequest = await req.json()

    // Control de acceso basado en plan
    if (profile?.plan === 'free') {
      // Plan gratuito: solo PDF básico con límite de 10 convocatorias
      if (format === 'csv') {
        return new Response(
          JSON.stringify({
            error: 'Funcionalidad Pro requerida',
            message: 'La exportación a CSV requiere Plan Pro. Actualice su plan para acceder a esta funcionalidad.',
            upgrade_required: true
          }),
          { status: 403, headers: corsHeaders }
        )
      }
    }

    // Construir query con filtros
    let query = supabase
      .from('convocatorias')
      .select('*')
      .eq('user_id', user.id)

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('estado', filters.status)
    }
    if (filters.organization) {
      query = query.ilike('institucion', `%${filters.organization}%`)
    }
    if (filters.category) {
      query = query.ilike('area', `%${filters.category}%`)
    }
    if (filters.date_from) {
      query = query.gte('fecha_cierre', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('fecha_cierre', filters.date_to)
    }
    if (filters.search) {
      query = query.or(`nombre_concurso.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`)
    }

    // Aplicar ordenamiento
    const sortBy = options.sort_by || 'created_at'
    const sortOrder = options.sort_order || 'desc'
    query = query.order(sortBy === 'date' ? 'fecha_cierre' : sortBy === 'name' ? 'nombre_concurso' : sortBy === 'institution' ? 'institucion' : 'created_at', { ascending: sortOrder === 'asc' })

    // Límite para plan gratuito
    if (profile?.plan === 'free') {
      query = query.limit(10)
    }

    const { data: convocatorias, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Error al obtener convocatorias: ${fetchError.message}`)
    }

    if (!convocatorias || convocatorias.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No se encontraron convocatorias',
          message: 'No hay convocatorias que coincidan con los filtros aplicados'
        }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Generar exportación según formato
    if (format === 'csv') {
      const csvContent = generateCSV(convocatorias, options)
      
      return new Response(
        csvContent,
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="convocatorias_${new Date().toISOString().split('T')[0]}.csv"`
          }
        }
      )
    } else if (format === 'pdf') {
      const htmlContent = generatePDF(convocatorias, options)
      
      return new Response(
        JSON.stringify({
          success: true,
          format: 'pdf',
          content: htmlContent,
          filename: `convocatorias_${new Date().toISOString().split('T')[0]}.pdf`,
          total_records: convocatorias.length,
          generated_at: new Date().toISOString()
        }),
        {
          status: 200,
          headers: corsHeaders
        }
      )
    } else {
      throw new Error('Formato no soportado. Use "csv" o "pdf"')
    }

  } catch (error) {
    console.error('Error en export-data:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Error al exportar datos',
        message: error instanceof Error ? error.message : 'Error desconocido'
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})