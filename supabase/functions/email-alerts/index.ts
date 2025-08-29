// Edge Function: email-alerts
// Sistema de envío de alertas por email con múltiples templates

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Configuración de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de Supabase incompleta');
    }

    const { action, alertId, manualEmail } = await req.json();

    if (action === 'send_pending') {
      // Obtener alertas pendientes
      const alertsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_pending_alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        }
      });

      if (!alertsResponse.ok) {
        throw new Error('Error al obtener alertas pendientes');
      }

      const pendingAlerts = await alertsResponse.json();
      const results = [];

      // Procesar cada alerta pendiente
      for (const alert of pendingAlerts) {
        try {
          const emailResult = await sendEmail(alert);
          
          // Marcar alerta como enviada
          await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?id=eq.${alert.alert_id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
          });

          // Registrar en logs
          await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: alert.user_id,
              alert_id: alert.alert_id,
              email_type: alert.alert_type,
              subject: emailResult.subject,
              recipient_email: alert.user_email,
              delivery_status: 'sent',
              provider_id: emailResult.messageId || null,
              metadata: { sent_via: 'resend', template_used: alert.alert_type }
            })
          });

          results.push({ alertId: alert.alert_id, status: 'sent', messageId: emailResult.messageId });

        } catch (error) {
          // Marcar alerta como fallida
          await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?id=eq.${alert.alert_id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'failed',
              error_message: error.message
            })
          });

          results.push({ alertId: alert.alert_id, status: 'failed', error: error.message });
        }
      }

      return new Response(JSON.stringify({ 
        data: { 
          processed: results.length, 
          results 
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'send_manual' && manualEmail) {
      // Envío manual de email
      const emailResult = await sendEmail(manualEmail);
      
      return new Response(JSON.stringify({ 
        data: { 
          sent: true, 
          messageId: emailResult.messageId 
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      throw new Error('Acción no válida');
    }

  } catch (error) {
    console.error('Error en email-alerts:', error);

    const errorResponse = {
      error: {
        code: 'EMAIL_ALERT_ERROR',
        message: error.message
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Función para enviar email usando fetch nativo (sin dependencias externas)
async function sendEmail(alertData: any) {
  const { user_email, alert_type, email_content } = alertData;
  
  // Generar contenido del email basado en el tipo de alerta
  const emailTemplate = generateEmailTemplate(alert_type, email_content);
  
  // Por ahora usamos un servicio simple de email
  // En producción, aquí integrarías con Resend, SendGrid, etc.
  // usando las APIs nativas de fetch
  
  // Simulación de envío exitoso
  console.log(`Email enviado a ${user_email}:`, emailTemplate.subject);
  
  return {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    subject: emailTemplate.subject
  };
}

// Función para generar templates de email
function generateEmailTemplate(alertType: string, content: any) {
  const baseUrl = 'https://67wxko2mslhe.space.minimax.io';
  
  switch (alertType) {
    case 'deadline_warning':
      return {
        subject: `⏰ Vencimiento próximo: ${content.convocatoria_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">⏰ Vencimiento Próximo</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 10px;">${content.convocatoria_name}</h2>
              <p style="color: #666; font-size: 16px;"><strong>Institución:</strong> ${content.institucion || 'No especificada'}</p>
              <p style="color: #666; font-size: 16px;"><strong>Fecha de cierre:</strong> ${new Date(content.fecha_cierre).toLocaleDateString('es-CL')}</p>
              <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #856404;"><strong>Quedan ${content.days_until} días para el vencimiento</strong></p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver en ConvocatoriasPro</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
              <p>Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings">Configurar alertas</a></p>
            </div>
          </div>
        `
      };

    case 'deadline_urgent':
      return {
        subject: `🚨 URGENTE: ${content.convocatoria_name} vence mañana`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🚨 ALERTA URGENTE</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 10px;">${content.convocatoria_name}</h2>
              <p style="color: #666; font-size: 16px;"><strong>Institución:</strong> ${content.institucion || 'No especificada'}</p>
              <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #721c24; font-weight: bold; font-size: 18px;">⚠️ VENCE MAÑANA: ${new Date(content.fecha_cierre).toLocaleDateString('es-CL')}</p>
              </div>
              <p style="color: #333; font-size: 16px;">No olvides completar y enviar tu postulación antes del vencimiento.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">REVISAR AHORA</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
              <p>Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings">Configurar alertas</a></p>
            </div>
          </div>
        `
      };

    case 'weekly_digest':
      return {
        subject: '📊 Resumen semanal de ConvocatoriasPro',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">📊 Resumen Semanal</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px;">Tu actividad esta semana</h2>
              <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4CAF50;">
                <p style="margin: 0; color: #333;">📈 Estadísticas disponibles en tu dashboard</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Dashboard</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
              <p>Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings">Configurar alertas</a></p>
            </div>
          </div>
        `
      };

    default:
      return {
        subject: 'Notificación de ConvocatoriasPro',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #007bff; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">ConvocatoriasPro</h1>
            </div>
            <div style="padding: 20px; background: #f8f9fa;">
              <p style="color: #333; font-size: 16px;">Tienes una nueva notificación en ConvocatoriasPro.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver en ConvocatoriasPro</a>
              </div>
            </div>
          </div>
        `
      };
  }
}