// Edge Function: send-email-alerts
// Sistema completo de envío de alertas por email con múltiples templates
// Compatible con Resend API para envío real de emails

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
    console.log('🔔 Iniciando procesamiento de alertas de email...');

    // Configuración de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de Supabase incompleta');
    }

    const { action, alertId, manualEmail, testMode = false } = await req.json();

    if (action === 'send_pending') {
      // Obtener alertas pendientes
      console.log('📋 Obteniendo alertas pendientes...');
      
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
      console.log(`📧 Encontradas ${pendingAlerts.length} alertas pendientes`);

      const results = [];

      // Procesar cada alerta pendiente
      for (const alert of pendingAlerts) {
        try {
          const emailResult = await sendEmail(alert, resendApiKey, testMode);
          
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
              metadata: { 
                sent_via: 'resend_api', 
                template_used: alert.alert_type,
                test_mode: testMode
              }
            })
          });

          results.push({ 
            alertId: alert.alert_id, 
            status: 'sent', 
            messageId: emailResult.messageId,
            recipient: alert.user_email
          });

          console.log(`✅ Email enviado exitosamente para alerta ${alert.alert_id}`);

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

          results.push({ 
            alertId: alert.alert_id, 
            status: 'failed', 
            error: error.message 
          });

          console.error(`❌ Error enviando email para alerta ${alert.alert_id}:`, error.message);
        }
      }

      return new Response(JSON.stringify({ 
        data: { 
          processed: results.length, 
          results,
          summary: {
            sent: results.filter(r => r.status === 'sent').length,
            failed: results.filter(r => r.status === 'failed').length
          }
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'send_manual' && manualEmail) {
      // Envío manual de email
      console.log('📤 Enviando email manual...');
      
      const emailResult = await sendEmail(manualEmail, resendApiKey, testMode);
      
      return new Response(JSON.stringify({ 
        data: { 
          sent: true, 
          messageId: emailResult.messageId,
          recipient: manualEmail.user_email
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'test_templates') {
      // Probar todos los templates de email
      console.log('🧪 Probando templates de email...');
      
      const testTemplates = [
        { alert_type: 'deadline_warning', email_content: { convocatoria_name: 'Test CORFO 2025', institucion: 'CORFO', fecha_cierre: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), days_until: 7 }},
        { alert_type: 'deadline_urgent', email_content: { convocatoria_name: 'Test FONDECYT', institucion: 'ANID', fecha_cierre: new Date(Date.now() + 24 * 60 * 60 * 1000), days_until: 1 }},
        { alert_type: 'weekly_digest', email_content: { stats: { total: 5, pending: 2, closing_soon: 1 }}},
        { alert_type: 'new_opportunity', email_content: { convocatoria_name: 'Nueva Oportunidad', institucion: 'MinCiencia' }}
      ];

      const templateResults = testTemplates.map(template => {
        const emailTemplate = generateEmailTemplate(template.alert_type, template.email_content);
        return {
          alert_type: template.alert_type,
          subject: emailTemplate.subject,
          html_preview: emailTemplate.html.substring(0, 200) + '...'
        };
      });

      return new Response(JSON.stringify({ 
        data: { 
          templates_tested: templateResults.length,
          templates: templateResults
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else {
      throw new Error('Acción no válida. Use: send_pending, send_manual, o test_templates');
    }

  } catch (error) {
    console.error('❌ Error en send-email-alerts:', error);

    const errorResponse = {
      error: {
        code: 'EMAIL_ALERT_ERROR',
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

// Función para enviar email usando Resend API
async function sendEmail(alertData: any, resendApiKey?: string, testMode = false) {
  const { user_email, alert_type, email_content } = alertData;
  
  // Generar contenido del email basado en el tipo de alerta
  const emailTemplate = generateEmailTemplate(alert_type, email_content);
  
  if (testMode || !resendApiKey) {
    // Modo de prueba - solo simular envío
    console.log(`📧 [MODO PRUEBA] Email para ${user_email}:`, emailTemplate.subject);
    
    return {
      messageId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject: emailTemplate.subject
    };
  }

  try {
    // Envío real usando Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ConvocatoriasPro <noreply@convocatoriaspro.cl>',
        to: [user_email],
        subject: emailTemplate.subject,
        html: emailTemplate.html
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Resend API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    
    console.log(`📧 Email enviado exitosamente a ${user_email}:`, result.id);
    
    return {
      messageId: result.id,
      subject: emailTemplate.subject
    };

  } catch (error) {
    console.error('Error enviando email con Resend:', error);
    throw error;
  }
}

// Función para generar templates de email responsivos y personalizables
function generateEmailTemplate(alertType: string, content: any) {
  const baseUrl = 'https://67wxko2mslhe.space.minimax.io';
  
  const baseStyles = `
    <style>
      @media (max-width: 600px) {
        .container { width: 100% !important; padding: 10px !important; }
        .header { padding: 15px !important; }
        .content { padding: 15px !important; }
        .button { padding: 10px 20px !important; font-size: 14px !important; }
      }
    </style>
  `;
  
  switch (alertType) {
    case 'deadline_warning':
      return {
        subject: `⏰ Vencimiento próximo: ${content.convocatoria_name}`,
        html: baseStyles + `
          <div class="container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">⏰ Vencimiento Próximo</h1>
            </div>
            <div class="content" style="padding: 25px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 15px; font-size: 20px; font-weight: 600;">${content.convocatoria_name}</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                <p style="color: #666; font-size: 16px; margin: 8px 0;"><strong>📋 Institución:</strong> ${content.institucion || 'No especificada'}</p>
                <p style="color: #666; font-size: 16px; margin: 8px 0;"><strong>📅 Fecha de cierre:</strong> ${new Date(content.fecha_cierre).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div style="background: #fff3cd; border: 1px solid #ffeeba; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #856404; font-weight: 600; font-size: 18px;">⏰ Quedan ${content.days_until} días para el vencimiento</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" class="button" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Ver en ConvocatoriasPro</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px;">
              <p style="margin: 0;">Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings" style="color: #667eea;">Configurar alertas</a></p>
            </div>
          </div>
        `
      };

    case 'deadline_urgent':
      return {
        subject: `🚨 URGENTE: ${content.convocatoria_name} vence mañana`,
        html: baseStyles + `
          <div class="container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div class="header" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">🚨 ALERTA URGENTE</h1>
            </div>
            <div class="content" style="padding: 25px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 15px; font-size: 20px; font-weight: 600;">${content.convocatoria_name}</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ff6b6b;">
                <p style="color: #666; font-size: 16px; margin: 8px 0;"><strong>📋 Institución:</strong> ${content.institucion || 'No especificada'}</p>
              </div>
              <div style="background: #f8d7da; border: 2px solid #f5c6cb; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #721c24; font-weight: 700; font-size: 20px;">⚠️ VENCE MAÑANA</p>
                <p style="margin: 5px 0 0 0; color: #721c24; font-weight: 600; font-size: 16px;">${new Date(content.fecha_cierre).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <p style="color: #333; font-size: 16px; text-align: center; margin: 20px 0;">No olvides completar y enviar tu postulación antes del vencimiento.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" class="button" style="background: #dc3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 700; font-size: 16px; box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);">REVISAR AHORA</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px;">
              <p style="margin: 0;">Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings" style="color: #dc3545;">Configurar alertas</a></p>
            </div>
          </div>
        `
      };

    case 'weekly_digest':
      return {
        subject: '📊 Resumen semanal de ConvocatoriasPro',
        html: baseStyles + `
          <div class="container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div class="header" style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">📊 Resumen Semanal</h1>
            </div>
            <div class="content" style="padding: 25px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 20px; font-size: 20px; font-weight: 600;">Tu actividad esta semana</h2>
              <div style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #4CAF50;">
                <p style="margin: 0; color: #333; font-size: 16px;">📈 Revisa tus estadísticas y convocatorias pendientes en el dashboard</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" class="button" style="background: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Ver Dashboard</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px;">
              <p style="margin: 0;">Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings" style="color: #4CAF50;">Configurar alertas</a></p>
            </div>
          </div>
        `
      };

    case 'new_opportunity':
      return {
        subject: '🎆 Nueva oportunidad de financiamiento disponible',
        html: baseStyles + `
          <div class="container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div class="header" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">🎆 Nueva Oportunidad</h1>
            </div>
            <div class="content" style="padding: 25px; background: #f8f9fa;">
              <h2 style="color: #333; margin-bottom: 15px; font-size: 20px; font-weight: 600;">Se ha encontrado una nueva convocatoria que podría interesarte</h2>
              <div style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #28a745;">
                <p style="margin: 0; color: #333; font-size: 16px;">🔍 Revisa las nuevas oportunidades disponibles en tu dashboard</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" class="button" style="background: #28a745; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Explorar Oportunidades</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px;">
              <p style="margin: 0;">Este email fue enviado por ConvocatoriasPro. <a href="${baseUrl}/app/settings" style="color: #28a745;">Configurar alertas</a></p>
            </div>
          </div>
        `
      };

    default:
      return {
        subject: 'Notificación de ConvocatoriasPro',
        html: baseStyles + `
          <div class="container" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div class="header" style="background: #007bff; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">ConvocatoriasPro</h1>
            </div>
            <div class="content" style="padding: 25px; background: #f8f9fa;">
              <p style="color: #333; font-size: 16px;">Tienes una nueva notificación en ConvocatoriasPro.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/app/dashboard" class="button" style="background: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Ver en ConvocatoriasPro</a>
              </div>
            </div>
            <div style="background: #e9ecef; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px;">
              <p style="margin: 0;">Este email fue enviado por ConvocatoriasPro.</p>
            </div>
          </div>
        `
      };
  }
}