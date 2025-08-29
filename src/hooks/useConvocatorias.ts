import { useState, useEffect } from 'react'
import { Convocatoria, ConvocatoriaForm, DashboardFilters } from '@/types'
import { convocatoriasService } from '@/services/convocatorias.service'
import { useAuth } from './useAuth'

export function useConvocatorias() {
  const { user } = useAuth()
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConvocatorias = async (filters: DashboardFilters = {}) => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const data = await convocatoriasService.getAll(user.id, filters)
      setConvocatorias(data)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching convocatorias:', err)
    } finally {
      setLoading(false)
    }
  }

  const createConvocatoria = async (convocatoriaData: ConvocatoriaForm) => {
    if (!user) throw new Error('Usuario no autenticado')

    const data = await convocatoriasService.create(user.id, convocatoriaData)

    // Actualizar lista local
    setConvocatorias(prev => [data, ...prev])
    return data
  }

  const updateConvocatoria = async (id: number, updates: Partial<ConvocatoriaForm>) => {
    if (!user) throw new Error('Usuario no autenticado')

    const data = await convocatoriasService.update(id, user.id, updates)

    // Actualizar lista local
    setConvocatorias(prev => 
      prev.map(conv => conv.id === id ? data : conv)
    )
    return data
  }

  const deleteConvocatoria = async (id: number) => {
    if (!user) throw new Error('Usuario no autenticado')

    await convocatoriasService.delete(id, user.id)

    // Actualizar lista local
    setConvocatorias(prev => prev.filter(conv => conv.id !== id))
  }

  const getConvocatoriaById = (id: number): Convocatoria | undefined => {
    return convocatorias.find(conv => conv.id === id)
  }

  useEffect(() => {
    if (user) {
      fetchConvocatorias()
    }
  }, [user])

  return {
    convocatorias,
    loading,
    isLoading: loading,
    error,
    fetchConvocatorias,
    createConvocatoria,
    updateConvocatoria,
    deleteConvocatoria,
    getConvocatoriaById,
    refresh: () => fetchConvocatorias()
  }
}

export function useConvocatoria(id: number) {
  const { getConvocatoriaById } = useConvocatorias()
  const [convocatoria, setConvocatoria] = useState<Convocatoria | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const found = getConvocatoriaById(id)
    setConvocatoria(found || null)
    setLoading(false)
  }, [id, getConvocatoriaById])

  return { convocatoria, loading }
}