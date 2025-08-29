// Servicio para gestión de planes y suscripciones
import { supabase } from '@/lib/supabase'
import { Plan, PlanType } from '@/types'
import { PLAN_TYPES } from '@/lib/constants'

export class PlansService {
  async getAll(): Promise<Plan[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price_clp', { ascending: true })

    if (error) {
      throw new Error(`Error al obtener planes: ${error.message}`)
    }

    return data || []
  }

  async selectPlan(planId: PlanType, userId: string): Promise<{ success: boolean; redirected?: boolean }> {
    if (planId === PLAN_TYPES.FREE) {
      // Actualizar a plan gratuito
      const { error } = await supabase
        .from('profiles')
        .update({
          plan: PLAN_TYPES.FREE,
          plan_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      if (error) {
        throw new Error(`Error al actualizar plan: ${error.message}`)
      }
      
      return { success: true }
    } else {
      // Para planes de pago, obtener URL de MercadoPago
      const plans = await this.getAll()
      const plan = plans.find(p => p.id === planId)
      
      if (!plan) {
        throw new Error('Plan no encontrado')
      }
      
      if (!plan.mp_checkout_url || plan.mp_checkout_url.trim() === '') {
        throw new Error(`El plan ${plan.name} no tiene configurado el enlace de MercadoPago`)
      }
      
      // Redirigir a MercadoPago con metadatos
      const checkoutUrl = new URL(plan.mp_checkout_url)
      checkoutUrl.searchParams.set('external_reference', userId)
      checkoutUrl.searchParams.set('metadata[user_id]', userId)
      checkoutUrl.searchParams.set('metadata[plan_id]', planId)
      
      window.location.href = checkoutUrl.toString()
      
      return { success: true, redirected: true }
    }
  }

  async getCurrentPlan(userId: string): Promise<Plan | null> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single()

    if (!profile?.plan) return null

    const plans = await this.getAll()
    return plans.find(p => p.id === profile.plan) || null
  }

  isPro(plan: string): boolean {
    return plan === PLAN_TYPES.PRO_MONTHLY || plan === PLAN_TYPES.PRO_ANNUAL
  }

  getConvocatoriasLimit(plan: string): number {
    return this.isPro(plan) ? Infinity : 5
  }

  canAccessFeature(plan: string, feature: string): boolean {
    if (this.isPro(plan)) return true
    
    const freeFeatures = [
      'basic_dashboard',
      'manual_entry', 
      'basic_calendar',
      'basic_filters',
      'basic_export'
    ]
    
    return freeFeatures.includes(feature)
  }
}

// Instancia singleton
export const plansService = new PlansService()