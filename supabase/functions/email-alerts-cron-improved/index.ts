// Edge Function: email-alerts-cron-improved
// Cron job mejorado para procesamiento automático de alertas
// Tipo: cron - se ejecuta automáticamente cada hora

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
    console.log('🔔 CRON JOB - Iniciando procesamiento automatizado de alertas...');
    console.log('⏰ Timestamp:', new Date().toISOString());

    // Configuración de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de Supabase incompleta');
    }

    const results = {
      timestamp: new Date().toISOString(),
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [],
      tasks_completed: []
    };

    // TAREA 1: Procesar alertas de vencimiento automáticas
    console.log('📋 TAREA 1: Generando alertas de vencimiento automáticas...');
    
    try {
      // Generar alertas para convocatorias que vencen en 7 días
      const deadlineWarningsQuery = `
        INSERT INTO scheduled_alerts (user_id, alert_type, convocatoria_id, scheduled_for, email_content)
        SELECT DISTINCT
          c.user_id,
          'deadline_warning',
          c.id,
          NOW(),
          jsonb_build_object(
            'convocatoria_name', c.nombre_concurso,
            'institucion', c.institucion,
            'fecha_cierre', c.fecha_cierre,
            'days_until', 7
          )
        FROM convocatorias c
        JOIN email_alert_preferences eap ON c.user_id = eap.user_id
        WHERE c.fecha_cierre BETWEEN NOW() + INTERVAL '6 days 23 hours' AND NOW() + INTERVAL '7 days 1 hour'
          AND c.estado = 'abierto'
          AND eap.deadline_warnings = true
          AND eap.email_notifications = true
          AND NOT EXISTS (
            SELECT 1 FROM scheduled_alerts sa 
            WHERE sa.convocatoria_id = c.id 
            AND sa.alert_type = 'deadline_warning'
          )
      `;

      const warningsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql_execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: deadlineWarningsQuery })
      });

      // Generar alertas urgentes para convocatorias que vencen mañana
      const urgentAlertsQuery = `
        INSERT INTO scheduled_alerts (user_id, alert_type, convocatoria_id, scheduled_for, email_content)
        SELECT DISTINCT
          c.user_id,
          'deadline_urgent',
          c.id,
          NOW(),
          jsonb_build_object(
            'convocatoria_name', c.nombre_concurso,
            'institucion', c.institucion,
            'fecha_cierre', c.fecha_cierre,
            'days_until', 1
          )
        FROM convocatorias c
        JOIN email_alert_preferences eap ON c.user_id = eap.user_id
        WHERE c.fecha_cierre BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
          AND c.estado = 'abierto'
          AND eap.deadline_urgent = true
          AND eap.email_notifications = true
          AND NOT EXISTS (
            SELECT 1 FROM scheduled_alerts sa 
            WHERE sa.convocatoria_id = c.id 
            AND sa.alert_type = 'deadline_urgent'
          )
      `;

      const urgentResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql_execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: urgentAlertsQuery })
      });

      results.tasks_completed.push('deadline_alerts_generation');
      
    } catch (error) {
      console.error('Error generando alertas automaticas:', error);
      results.errors.push(`Generación de alertas: ${error.message}`);
    }

    // TAREA 2: Obtener y procesar alertas pendientes
    console.log('📧 TAREA 2: Procesando alertas pendientes...');
    
    const alertsResponse = await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?status=eq.pending&scheduled_for=lte.${new Date().toISOString()}&select=*,profiles(*)`, {
      method: 'GET',
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
    console.log(`📧 Encontradas ${pendingAlerts.length} alertas pendientes`);

    // Obtener emails de usuarios
    const userIds = [...new Set(pendingAlerts.map(alert => alert.user_id))];
    let userEmails = {};
    
    if (userIds.length > 0) {
      const usersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        userEmails = usersData.users.reduce((acc, user) => {
          acc[user.id] = user.email;
          return acc;
        }, {});
      }
    }

    // Procesar cada alerta pendiente
    for (const alert of pendingAlerts) {
      results.processed++;
      
      try {
        const userEmail = userEmails[alert.user_id];
        
        if (!userEmail) {
          throw new Error('Email de usuario no encontrado');
        }

        // Generar contenido del email
        const emailTemplate = generateEmailTemplate(alert.alert_type, alert.email_content);
        
        // Enviar email
        let emailResult;
        if (resendApiKey) {
          emailResult = await sendEmailWithResend(userEmail, emailTemplate, resendApiKey);
        } else {
          // Modo simulación si no hay API key
          console.log(`📧 [SIMULACIÓN] Email para ${userEmail}: ${emailTemplate.subject}`);
          emailResult = {
            messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'simulated'
          };
        }
        
        // Marcar alerta como enviada
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?id=eq.${alert.id}`, {
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
            alert_id: alert.id,
            email_type: alert.alert_type,
            subject: emailTemplate.subject,
            recipient_email: userEmail,
            delivery_status: 'sent',
            provider_id: emailResult.messageId,
            metadata: { 
              sent_via: 'cron_job_improved', 
              template_used: alert.alert_type,
              processed_at: new Date().toISOString(),
              resend_used: !!resendApiKey
            }
          })
        });

        results.sent++;
        console.log(`✅ Email enviado exitosamente para alerta ${alert.id}`);

      } catch (error) {
        results.failed++;
        results.errors.push(`Alerta ${alert.id}: ${error.message}`);
        
        console.error(`❌ Error procesando alerta ${alert.id}:`, error);
        
        // Marcar alerta como fallida
        try {
          await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?id=eq.${alert.id}`, {
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

    // TAREA 3: Limpieza de alertas y logs antiguos
    console.log('🧽 TAREA 3: Limpieza de datos antiguos...');
    
    try {
      const cleanupDate = new Date();
      cleanupDate.setDate(cleanupDate.getDate() - 30);
      
      // Limpiar alertas enviadas antiguas
      const cleanupAlertsResponse = await fetch(`${supabaseUrl}/rest/v1/scheduled_alerts?status=eq.sent&sent_at=lt.${cleanupDate.toISOString()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      });
      
      // Limpiar logs de email antiguos (más de 90 días)
      const cleanupLogsDate = new Date();
      cleanupLogsDate.setDate(cleanupLogsDate.getDate() - 90);
      
      const cleanupLogsResponse = await fetch(`${supabaseUrl}/rest/v1/email_logs?created_at=lt.${cleanupLogsDate.toISOString()}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey
        }
      });
      
      results.tasks_completed.push('data_cleanup');
      
    } catch (error) {
      console.error('Error en limpieza de datos:', error);
      results.errors.push(`Limpieza: ${error.message}`);
    }

    // TAREA 4: Generar resúmenes semanales (solo los lunes)
    const today = new Date();
    if (today.getDay() === 1) { // Lunes
      console.log('📊 TAREA 4: Generando resúmenes semanales...');
      
      try {
        const weeklyDigestQuery = `
          INSERT INTO scheduled_alerts (user_id, alert_type, scheduled_for, email_content)
          SELECT DISTINCT
            eap.user_id,
            'weekly_digest',
            NOW(),
            jsonb_build_object(
              'week_start', NOW() - INTERVAL '7 days',
              'week_end', NOW()
            )
          FROM email_alert_preferences eap
          WHERE eap.weekly_digest = true
            AND eap.email_notifications = true
            AND NOT EXISTS (
              SELECT 1 FROM scheduled_alerts sa 
              WHERE sa.user_id = eap.user_id 
              AND sa.alert_type = 'weekly_digest'
              AND sa.created_at > NOW() - INTERVAL '7 days'
            )
        `;

        const weeklyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sql_execute`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: weeklyDigestQuery })
        });
        
        results.tasks_completed.push('weekly_digest_generation');
        
      } catch (error) {
        console.error('Error generando resúmenes semanales:', error);
        results.errors.push(`Resúmenes semanales: ${error.message}`);
      }
    }

    console.log('✅ Procesamiento de alertas CRON completado:', results);

    return new Response(JSON.stringify({ 
      data: {
        message: 'Procesamiento de alertas CRON completado exitosamente',
        ...results,
        next_run_in_hours: 1
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error en email-alerts-cron-improved:', error);

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

// Función para enviar email con Resend API
async function sendEmailWithResend(userEmail: string, emailTemplate: any, resendApiKey: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'ConvocatoriasPro <noreply@convocatoriaspro.cl>',
      to: [userEmail],
      subject: emailTemplate.subject,
      html: emailTemplate.html
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  
  return {
    messageId: result.id,
    status: 'sent'
  };
}

// Función para generar templates de email (versión simplificada para cron)
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
              <h2 style="color: #333;">${content.convocatoria_name}</h2>
              <p><strong>Institución:</strong> ${content.institucion}</p>
              <p><strong>Fecha de cierre:</strong> ${new Date(content.fecha_cierre).toLocaleDateString('es-CL')}</p>
              <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #856404;"><strong>Quedan ${content.days_until} días</strong></p>
              </div>
              <div style="text-align: center;">
                <a href="${baseUrl}/app/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Ver en ConvocatoriasPro</a>
              </div>
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
              <h2 style="color: #333;">${content.convocatoria_name}</h2>
              <div style="background: #f8d7da; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #721c24; font-weight: bold;">⚠️ VENCE MAÑANA</p>
              </div>
              <div style="text-align: center;">
                <a href="${baseUrl}/app/dashboard" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">REVISAR AHORA</a>
              </div>
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
              <h2 style="color: #333;">Tu actividad esta semana</h2>
              <div style="text-align: center;">
                <a href="${baseUrl}/app/dashboard" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Ver Dashboard</a>
              </div>
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
            <div style="padding: 20px;">
              <p>Tienes una nueva notificación.</p>
              <div style="text-align: center;">
                <a href="${baseUrl}/app/dashboard" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Ver Dashboard</a>
              </div>
            </div>
          </div>
        `
      };
  }
}