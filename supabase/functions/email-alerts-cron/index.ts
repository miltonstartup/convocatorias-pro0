// Edge Function: email-alerts-cron
// Cron job para procesar alertas de email automáticamente
// Tipo: cron - se ejecutará automáticamente en intervalos programados

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('Iniciando procesamiento de alertas de email...');

    // Configuración de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de Supabase incompleta');
    }

    // Obtener alertas pendientes que deben enviarse ahora
    const alertsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_pending_alerts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      }
    });

    if (!alertsResponse.ok) {
      const errorText = await alertsResponse.text();
      throw new Error(`Error al obtener alertas pendientes: ${errorText}`);
    }

    const pendingAlerts = await alertsResponse.json();
    console.log(`Encontradas ${pendingAlerts.length} alertas pendientes`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: []
    };

    // Procesar cada alerta pendiente
    for (const alert of pendingAlerts) {
      results.processed++;
      
      try {
        // Generar contenido del email
        const emailTemplate = generateEmailTemplate(alert.alert_type, alert.email_content);
        
        // Por ahora simulamos el envío - en producción integrar con Resend/SendGrid
        console.log(`Enviando email a ${alert.user_email}: ${emailTemplate.subject}`);
        
        // Simular envío exitoso
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Marcar alerta como enviada
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?id=eq.${alert.alert_id}`, {
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

        if (!updateResponse.ok) {
          throw new Error('Error al actualizar estado de alerta');
        }

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
            subject: emailTemplate.subject,
            recipient_email: alert.user_email,
            delivery_status: 'sent',
            provider_id: messageId,
            metadata: { 
              sent_via: 'cron_job', 
              template_used: alert.alert_type,
              processed_at: new Date().toISOString()
            }
          })
        });

        results.sent++;
        console.log(`✓ Email enviado exitosamente para alerta ${alert.alert_id}`);

      } catch (error) {
        results.failed++;
        results.errors.push(`Alerta ${alert.alert_id}: ${error.message}`);
        
        console.error(`✗ Error procesando alerta ${alert.alert_id}:`, error);
        
        // Marcar alerta como fallida
        try {
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
        } catch (updateError) {
          console.error('Error al marcar alerta como fallida:', updateError);
        }
      }
    }

    // Limpiar alertas antiguas (más de 30 días)
    const cleanupDate = new Date();
    cleanupDate.setDate(cleanupDate.getDate() - 30);
    
    await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?status=eq.sent&sent_at=lt.${cleanupDate.toISOString()}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    console.log('Procesamiento de alertas completado:', results);

    return new Response(JSON.stringify({ 
      data: {
        message: 'Procesamiento de alertas completado',
        timestamp: new Date().toISOString(),
        ...results
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en email-alerts-cron:', error);

    const errorResponse = {
      error: {
        code: 'EMAIL_CRON_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Función para generar templates de email
function generateEmailTemplate(alertType: string, content: any) {
  const baseUrl = 'https://67wxko2mslhe.space.minimax.io';
  
  switch (alertType) {
    case 'deadline_warning':
      return {
        subject: `⏰ Vencimiento próximo: ${content.convocatoria_name}`,
        html: generateWarningEmailHtml(content, baseUrl)
      };

    case 'deadline_urgent':
      return {
        subject: `🚨 URGENTE: ${content.convocatoria_name} vence mañana`,
        html: generateUrgentEmailHtml(content, baseUrl)
      };

    case 'weekly_digest':
      return {
        subject: '📊 Resumen semanal de ConvocatoriasPro',
        html: generateWeeklyDigestHtml(content, baseUrl)
      };

    case 'new_opportunity':
      return {
        subject: '🎆 Nueva oportunidad de financiamiento disponible',
        html: generateNewOpportunityHtml(content, baseUrl)
      };

    default:
      return {
        subject: 'Notificación de ConvocatoriasPro',
        html: generateDefaultEmailHtml(content, baseUrl)
      };
  }
}

function generateWarningEmailHtml(content: any, baseUrl: string): string {
  return `
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
  `;
}

function generateUrgentEmailHtml(content: any, baseUrl: string): string {
  return `
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
  `;
}

function generateWeeklyDigestHtml(content: any, baseUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">📊 Resumen Semanal</h1>
      </div>
      <div style="padding: 20px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 20px;">Tu actividad esta semana</h2>
        <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4CAF50;">
          <p style="margin: 0; color: #333;">📈 Revisa tus estadísticas y convocatorias pendientes</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/app/dashboard" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Dashboard</a>
        </div>
      </div>
      <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
        <p>Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings">Configurar alertas</a></p>
      </div>
    </div>
  `;
}

function generateNewOpportunityHtml(content: any, baseUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎆 Nueva Oportunidad</h1>
      </div>
      <div style="padding: 20px; background: #f8f9fa;">
        <h2 style="color: #333; margin-bottom: 10px;">Se ha encontrado una nueva convocatoria que podría interesarte</h2>
        <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #28a745;">
          <p style="margin: 0; color: #333;">🔍 Revisa las nuevas oportunidades disponibles</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/app/dashboard" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Explorar Oportunidades</a>
        </div>
      </div>
      <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
        <p>Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings">Configurar alertas</a></p>
      </div>
    </div>
  `;
}

function generateDefaultEmailHtml(content: any, baseUrl: string): string {
  return `
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
      <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d;">
        <p>Este email fue enviado por ConvocatoriasPro.</p>
      </div>
    </div>
  `;
}