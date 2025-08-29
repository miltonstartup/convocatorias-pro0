import { useState, useEffect } from 'react'
import { Plan, PlanType } from '@/types'
import { plansService } from '@/services/plans.service'
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

      const data = await plansService.getAll()
      setPlans(data)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectPlan = async (planId: PlanType) => {
    if (!user) throw new Error('Usuario no autenticado')

    return await plansService.selectPlan(planId, user.id)
  }

  const getCurrentPlan = (): Plan | null => {
    if (!user || !profile) return null
    return plans.find(p => p.id === profile.plan) || null
  }

  const isProPlan = (): boolean => {
    const userPlan = profile?.plan || 'free'
    return plansService.isPro(userPlan)
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
    const userPlan = profile?.plan || 'free'
    return plansService.getConvocatoriasLimit(userPlan)
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