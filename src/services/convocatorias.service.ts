// Servicio para gestión de convocatorias
import { supabase } from '@/lib/supabase'
import { Convocatoria, ConvocatoriaForm } from '@/types'

export class ConvocatoriasService {
  async getAll(userId: string, filters: any = {}): Promise<Convocatoria[]> {
    let query = supabase
      .from('convocatorias')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters.estado && filters.estado !== 'todos') {
      query = query.eq('estado', filters.estado)
    }

    if (filters.institucion) {
      query = query.ilike('institucion', `%${filters.institucion}%`)
    }

    if (filters.tipo_fondo) {
      query = query.ilike('tipo_fondo', `%${filters.tipo_fondo}%`)
    }

    if (filters.search) {
      query = query.or(`nombre_concurso.ilike.%${filters.search}%,institucion.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Error al obtener convocatorias: ${error.message}`)
    }

    return data || []
  }

  async getById(id: number, userId: string): Promise<Convocatoria | null> {
    const { data, error } = await supabase
      .from('convocatorias')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No encontrado
      }
      throw new Error(`Error al obtener convocatoria: ${error.message}`)
    }

    return data
  }

  async create(userId: string, convocatoriaData: ConvocatoriaForm): Promise<Convocatoria> {
    const processedData = {
      ...convocatoriaData,
      user_id: userId,
      // Convertir fechas de formato YYYY-MM-DD a timestamps con hora
      fecha_apertura: convocatoriaData.fecha_apertura ? 
        `${convocatoriaData.fecha_apertura} 09:00:00` : null,
      fecha_cierre: convocatoriaData.fecha_cierre ? 
        `${convocatoriaData.fecha_cierre} 23:59:59` : null,
      fecha_resultados: convocatoriaData.fecha_resultados ? 
        `${convocatoriaData.fecha_resultados} 18:00:00` : null
    }

    const { data, error } = await supabase
      .from('convocatorias')
      .insert(processedData)
      .select()
      .single()

    if (error) {
      throw new Error(`Error al crear convocatoria: ${error.message}`)
    }

    return data
  }

  async update(id: number, userId: string, updates: Partial<ConvocatoriaForm>): Promise<Convocatoria> {
    const processedUpdates = {
      ...updates,
      // Convertir fechas si están presentes
      ...(updates.fecha_apertura && {
        fecha_apertura: `${updates.fecha_apertura} 09:00:00`
      }),
      ...(updates.fecha_cierre && {
        fecha_cierre: `${updates.fecha_cierre} 23:59:59`
      }),
      ...(updates.fecha_resultados && {
        fecha_resultados: `${updates.fecha_resultados} 18:00:00`
      })
    }

    const { data, error } = await supabase
      .from('convocatorias')
      .update(processedUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Error al actualizar convocatoria: ${error.message}`)
    }

    return data
  }

  async delete(id: number, userId: string): Promise<void> {
    const { error } = await supabase
      .from('convocatorias')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Error al eliminar convocatoria: ${error.message}`)
    }
  }

  async getStats(userId: string) {
    const { data: convocatorias } = await supabase
      .from('convocatorias')
      .select('estado, fecha_cierre, created_at')
      .eq('user_id', userId)

    if (!convocatorias) return null

    const now = new Date()
    const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return {
      total: convocatorias.length,
      abiertas: convocatorias.filter(c => c.estado === 'abierto').length,
      cerradas: convocatorias.filter(c => c.estado === 'cerrado').length,
      en_evaluacion: convocatorias.filter(c => c.estado === 'en_evaluacion').length,
      proximas_a_cerrar: convocatorias.filter(c => {
        if (!c.fecha_cierre) return false
        const deadline = new Date(c.fecha_cierre)
        return deadline >= now && deadline <= oneWeek
      }).length
    }
  }
}

// Instancia singleton
export const convocatoriasService = new ConvocatoriasService()