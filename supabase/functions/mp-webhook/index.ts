// Edge Function: mp-webhook
// Webhook para recibir notificaciones de pago de MercadoPago Chile

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface MercadoPagoNotification {
  id: string
  live_mode: boolean
  type: string
  date_created: string
  application_id: string
  user_id: string
  version: number
  api_version: string
  action: string
  data: {
    id: string
  }
}

interface PaymentData {
  id: string
  status: string
  status_detail: string
  external_reference: string
  payer: {
    id: string
    email: string
  }
  metadata: {
    user_id?: string
    plan_id?: string
  }
  transaction_amount: number
  currency_id: string
  payment_method_id: string
  date_created: string
  date_approved?: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
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
    // Inicializar Supabase con service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener el cuerpo de la notificación
    const notification: MercadoPagoNotification = await req.json()
    
    console.log('Webhook recibido:', notification)

    // Verificar que es una notificación de pago
    if (notification.type !== 'payment') {
      return new Response(
        JSON.stringify({ message: 'Tipo de notificación no relevante' }),
        { status: 200, headers: corsHeaders }
      )
    }

    // Obtener detalles del pago desde MercadoPago
    // NOTA: En producción necesitarás tu access token de MercadoPago
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!mpAccessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN no configurado')
      return new Response(
        JSON.stringify({ error: 'Configuración de MercadoPago faltante' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${notification.data.id}`,
      {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!paymentResponse.ok) {
      throw new Error(`Error al obtener pago de MercadoPago: ${paymentResponse.status}`)
    }

    const paymentData: PaymentData = await paymentResponse.json()
    
    console.log('Datos del pago:', paymentData)

    // Registrar el pago en la tabla payments
    const { error: paymentInsertError } = await supabase
      .from('payments')
      .insert({
        user_id: paymentData.metadata?.user_id,
        plan_id: paymentData.metadata?.plan_id,
        mp_payment_id: paymentData.id,
        status: paymentData.status,
        amount: Math.round(paymentData.transaction_amount),
        currency: paymentData.currency_id,
        payment_method: paymentData.payment_method_id,
        external_reference: paymentData.external_reference,
        metadata: paymentData.metadata || {}
      })

    if (paymentInsertError) {
      console.error('Error al insertar pago:', paymentInsertError)
    }

    // Si el pago fue aprobado, actualizar el plan del usuario
    if (paymentData.status === 'approved' && paymentData.metadata?.user_id && paymentData.metadata?.plan_id) {
      const userId = paymentData.metadata.user_id
      const planId = paymentData.metadata.plan_id
      
      // Calcular fecha de expiración
      let expiresAt = null
      if (planId === 'pro_monthly') {
        expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else if (planId === 'pro_annual') {
        expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      }

      // Actualizar el plan en auth.users (metadata)
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: { 
            plan: planId,
            plan_expires_at: expiresAt?.toISOString()
          }
        }
      )

      if (authUpdateError) {
        console.error('Error al actualizar metadata del usuario:', authUpdateError)
      } else {
        console.log(`Plan actualizado para usuario ${userId}: ${planId}`)
      }

      // También actualizar en la tabla profiles (el trigger se encarga, pero por seguridad)
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          plan: planId,
          plan_expires_at: expiresAt?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileUpdateError) {
        console.error('Error al actualizar perfil:', profileUpdateError)
      }
    }

    // Responder a MercadoPago que el webhook fue procesado
    return new Response(
      JSON.stringify({ 
        message: 'Webhook procesado correctamente',
        payment_id: paymentData.id,
        status: paymentData.status
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error en mp-webhook:', error)
    
    // Es importante responder 200 a MercadoPago para evitar reintentos
    return new Response(
      JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      }),
      { status: 200, headers: corsHeaders }
    )
  }
})