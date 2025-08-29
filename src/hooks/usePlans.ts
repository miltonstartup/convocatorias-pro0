import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plan, PlanType } from '@/types'
import { useAuth } from './useAuth'

export function usePlans() {
  const { user, profile, updateProfile } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_clp', { ascending: true })

      if (error) {
        throw error
      }

      setPlans(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectPlan = async (planId: PlanType) => {
    if (!user) throw new Error('Usuario no autenticado')

    if (planId === 'free') {
      // Actualizar a plan gratuito
      const { error } = await updateProfile({
        plan: 'free',
        plan_expires_at: null
      })
      
      if (error) {
        throw error
      }
      
      return { success: true }
    } else {
      // Para planes de pago, redirigir a MercadoPago
      const plan = plans.find(p => p.id === planId)
      if (!plan) {
        throw new Error('Plan no encontrado')
      }
      
      // Validar que el plan tenga URL de MercadoPago configurada
      if (!plan.mp_checkout_url || plan.mp_checkout_url.trim() === '') {
        throw new Error(`El plan ${plan.name} no tiene configurado el enlace de MercadoPago. Por favor contacta soporte.`)
      }
      
      console.log('Plan encontrado:', plan)
      console.log('URL de checkout:', plan.mp_checkout_url)
      
      // NO actualizar el plan hasta que se confirme el pago
      // El webhook mp-webhook se encarga de actualizar el plan tras pago exitoso
      
      try {
        // Redirigir a MercadoPago con user_id y plan_id en la URL
        const checkoutUrl = new URL(plan.mp_checkout_url)
        checkoutUrl.searchParams.set('external_reference', user.id)
        checkoutUrl.searchParams.set('metadata[user_id]', user.id)
        checkoutUrl.searchParams.set('metadata[plan_id]', planId)
        
        console.log('URL final de checkout:', checkoutUrl.toString())
        
        // Usar window.location.href en lugar de window.open para evitar bloqueo de popup
        window.location.href = checkoutUrl.toString()
        
        return { success: true, redirected: true }
      } catch (urlError) {
        console.error('Error al construir URL de MercadoPago:', urlError)
        throw new Error(`URL de MercadoPago inválida para el plan ${plan.name}. Por favor contacta soporte.`)
      }
    }
  }

  const getCurrentPlan = (): Plan | null => {
    if (!profile) return null
    return plans.find(p => p.id === profile.plan) || null
  }

  const isProPlan = (): boolean => {
    return profile?.plan === 'pro_monthly' || profile?.plan === 'pro_annual'
  }

  const isTrialActive = (): boolean => {
    if (!profile?.trial_ends_at) return false
    return new Date(profile.trial_ends_at) > new Date()
  }

  const getTrialDaysLeft = (): number => {
    if (!profile?.trial_ends_at) return 0
    const trialEnd = new Date(profile.trial_ends_at)
    const now = new Date()
    const diffTime = trialEnd.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  const canAccessFeature = (feature: string): boolean => {
    if (isProPlan() || isTrialActive()) return true
    
    // Funciones disponibles en plan gratuito
    const freeFeatures = [
      'basic_dashboard',
      'manual_entry',
      'basic_calendar',
      'basic_filters',
      'basic_export'
    ]
    
    // Funciones que requieren Plan Pro
    const proFeatures = [
      'ai_agents',
      'ai_parsing',
      'ai_validation',
      'ai_enhancement',
      'export_data',
      'advanced_export',
      'bulk_import',
      'smart_detection',
      'unlimited_convocatorias'
    ]
    
    if (proFeatures.includes(feature)) {
      return isProPlan() || isTrialActive()
    }
    
    return freeFeatures.includes(feature)
  }

  const getConvocatoriasLimit = (): number => {
    if (isProPlan() || isTrialActive()) return Infinity
    return 5 // Límite para plan gratuito
  }

  const hasReachedLimit = (currentCount: number): boolean => {
    const limit = getConvocatoriasLimit()
    return limit !== Infinity && currentCount >= limit
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  return {
    plans,
    loading,
    error,
    selectPlan,
    getCurrentPlan,
    isProPlan,
    isTrialActive,
    getTrialDaysLeft,
    canAccessFeature,
    getConvocatoriasLimit,
    hasReachedLimit,
    refresh: fetchPlans
  }
}