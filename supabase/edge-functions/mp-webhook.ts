// Edge Function para manejar webhooks de MercadoPago
// Archivo: supabase/functions/mp-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface MercadoPagoWebhook {
  action: string
  api_version: string
  data: {
    id: string
    status?: string
    metadata?: {
      user_id: string
      plan_id: string
    }
  }
  date_created: string
  id: number
  live_mode: boolean
  type: string
  user_id: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhook: MercadoPagoWebhook = await req.json()
    console.log('Received webhook:', JSON.stringify(webhook, null, 2))

    // Verificar que es una notificación de pago
    if (webhook.type === 'payment' && webhook.action === 'payment.updated') {
      const paymentId = webhook.data.id
      
      // Obtener detalles del pago desde MercadoPago API
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      if (!mpAccessToken) {
        throw new Error('MercadoPago access token not configured')
      }

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`
        }
      })

      if (!paymentResponse.ok) {
        throw new Error(`Failed to fetch payment details: ${paymentResponse.statusText}`)
      }

      const paymentData = await paymentResponse.json()
      console.log('Payment data:', JSON.stringify(paymentData, null, 2))

      // Extraer metadatos del pago
      const userId = paymentData.metadata?.user_id
      const planId = paymentData.metadata?.plan_id
      
      if (!userId || !planId) {
        throw new Error('Missing user_id or plan_id in payment metadata')
      }

      // Registrar el pago en la base de datos
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          plan_id: planId,
          mp_payment_id: paymentId,
          status: paymentData.status,
          amount: paymentData.transaction_amount,
          currency: paymentData.currency_id,
          payment_data: paymentData
        })

      if (paymentError) {
        console.error('Error saving payment:', paymentError)
        throw paymentError
      }

      // Si el pago fue aprobado, actualizar el plan del usuario
      if (paymentData.status === 'approved') {
        const planExpiresAt = new Date()
        if (planId === 'pro_monthly') {
          planExpiresAt.setMonth(planExpiresAt.getMonth() + 1)
        } else if (planId === 'pro_annual') {
          planExpiresAt.setFullYear(planExpiresAt.getFullYear() + 1)
        }

        // Actualizar perfil del usuario
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            plan: planId,
            plan_expires_at: planExpiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (profileError) {
          console.error('Error updating user profile:', profileError)
          throw profileError
        }

        console.log(`Successfully updated user ${userId} to plan ${planId}`)
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
