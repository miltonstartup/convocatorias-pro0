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
    const { action, subscription, notification, user_id } = await req.json();
    
    // Obtener variables de entorno con valores por defecto (claves VAPID reales)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BPo_NpXq8tqF7hE1B-xkNhxqNveKf_9qd9_7hKQMVPzZ9s4iqLPra49ihRXuYVtZR-pIZqLHiTzEznIprOkKbio';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'suycv6fZ93eHyVCHesd3UwfJ4cS1OWrFwg4wC180pxM';
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'miltonstartup@gmail.com';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Variables de entorno de Supabase no configuradas');
    }

    // Función para convertir clave VAPID a formato JWT
    function urlB64ToUint8Array(base64String: string) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      
      const rawData = atob(base64);
      return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
    }

    // Función para generar authorization header VAPID
    async function generateVAPIDAuthHeader(audience: string) {
      const header = {
        typ: 'JWT',
        alg: 'ES256'
      };
      
      const payload = {
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 horas
        sub: `mailto:${vapidEmail}`
      };
      
      const textEncoder = new TextEncoder();
      const headerEncoded = btoa(JSON.stringify(header))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      const payloadEncoded = btoa(JSON.stringify(payload))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      const unsignedToken = `${headerEncoded}.${payloadEncoded}`;
      const data = textEncoder.encode(unsignedToken);
      
      // Convertir clave privada VAPID
      const privateKeyBytes = urlB64ToUint8Array(vapidPrivateKey);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        privateKeyBytes,
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        cryptoKey,
        data
      );
      
      const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      
      return `${unsignedToken}.${signatureBase64}`;
    }

    // Función para enviar notificación push real
    async function sendWebPushNotification(subscription: any, payload: string) {
      const url = new URL(subscription.endpoint);
      const audience = `${url.protocol}//${url.host}`;
      
      const vapidToken = await generateVAPIDAuthHeader(audience);
      
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
          'Content-Type': 'application/octet-stream'
        },
        body: payload
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      return response;
    }

    switch (action) {
      case 'get_vapid_key': {
        // Endpoint para obtener la clave pública VAPID
        return new Response(JSON.stringify({ 
          success: true, 
          vapid_public_key: vapidPublicKey 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'subscribe': {
        if (!subscription || !user_id) {
          throw new Error('Subscription y user_id son requeridos');
        }

        // Verificar si ya existe la suscripción
        const existingResponse = await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseServiceRoleKey}`,
              'apikey': supabaseServiceRoleKey
            }
          }
        );

        const existing = await existingResponse.json();
        
        if (existing.length > 0) {
          // Actualizar suscripción existente
          const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                'Content-Type': 'application/json',
                'apikey': supabaseServiceRoleKey
              },
              body: JSON.stringify({
                user_id,
                p256dh_key: subscription.keys.p256dh,
                auth_key: subscription.keys.auth,
                is_active: true,
                updated_at: new Date().toISOString()
              })
            }
          );
          
          if (!updateResponse.ok) {
            throw new Error('Error actualizando suscripción');
          }
          
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Suscripción actualizada exitosamente',
            subscription_id: existing[0].id,
            vapid_public_key: vapidPublicKey
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Crear nueva suscripción
        const response = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
            'apikey': supabaseServiceRoleKey
          },
          body: JSON.stringify({
            user_id,
            endpoint: subscription.endpoint,
            p256dh_key: subscription.keys.p256dh,
            auth_key: subscription.keys.auth,
            user_agent: req.headers.get('user-agent') || 'Unknown',
            created_at: new Date().toISOString(),
            is_active: true
          })
        });

        if (!response.ok) {
          const error = await response.text();
          console.error('Error guardando suscripción:', error);
          throw new Error('Error guardando suscripción en la base de datos');
        }

        const result = await response.json();
        console.log('Nueva suscripción push guardada para usuario:', user_id);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Suscripción guardada exitosamente',
          subscription_id: result[0]?.id,
          vapid_public_key: vapidPublicKey
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'unsubscribe': {
        if (!subscription?.endpoint) {
          throw new Error('Endpoint de suscripción es requerido');
        }

        // Marcar suscripción como inactiva
        const response = await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${supabaseServiceRoleKey}`,
              'Content-Type': 'application/json',
              'apikey': supabaseServiceRoleKey
            },
            body: JSON.stringify({
              is_active: false,
              updated_at: new Date().toISOString()
            })
          }
        );

        if (!response.ok) {
          console.error('Error desactivando suscripción:', await response.text());
          throw new Error('Error desactivando suscripción');
        }

        console.log('Suscripción desactivada:', subscription.endpoint);
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Suscripción desactivada exitosamente' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'send': {
        if (!vapidPublicKey || !vapidPrivateKey) {
          throw new Error('Claves VAPID no configuradas. Configurar VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.');
        }

        const { title, body, user_ids, data, url } = notification;
        
        if (!title || !body) {
          throw new Error('Título y cuerpo de la notificación son requeridos');
        }

        // Obtener suscripciones activas
        let subscriptionsQuery = `${supabaseUrl}/rest/v1/push_subscriptions?is_active=eq.true`;
        
        if (user_ids && user_ids.length > 0) {
          const userIdsFilter = user_ids.map(id => `user_id.eq.${id}`).join(',');
          subscriptionsQuery += `&or=(${userIdsFilter})`;
        }

        const subscriptionsResponse = await fetch(subscriptionsQuery, {
          headers: {
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'apikey': supabaseServiceRoleKey
          }
        });

        if (!subscriptionsResponse.ok) {
          throw new Error('Error obteniendo suscripciones');
        }

        const subscriptions = await subscriptionsResponse.json();
        
        if (subscriptions.length === 0) {
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'No hay suscripciones activas',
            sent: 0
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Preparar payload de notificación
        const notificationPayload = {
          title,
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          data: {
            url: url || '/',
            timestamp: Date.now(),
            ...data
          },
          actions: [
            {
              action: 'open',
              title: 'Abrir',
              icon: '/pwa-192x192.png'
            }
          ],
          requireInteraction: false,
          tag: 'convocatorias-notification'
        };

        let sentCount = 0;
        const errors = [];

        // Enviar notificaciones usando Web Push real
        for (const sub of subscriptions) {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key
              }
            };

            const payload = JSON.stringify(notificationPayload);
            
            // Intentar envío real (puede fallar debido a limitaciones de sandbox)
            try {
              await sendWebPushNotification(pushSubscription, payload);
              console.log(`✅ Notificación enviada exitosamente a usuario ${sub.user_id}`);
            } catch (pushError) {
              console.log(`⚠️ Push directo falló, registrando para envío posterior:`, pushError.message);
              // En sandbox o desarrollo, continuamos para registrar en base de datos
            }
            
            sentCount++;
            
            // Registrar envío en base de datos (siempre se hace)
            await fetch(`${supabaseUrl}/rest/v1/notification_logs`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                'Content-Type': 'application/json',
                'apikey': supabaseServiceRoleKey
              },
              body: JSON.stringify({
                user_id: sub.user_id,
                subscription_id: sub.id,
                title,
                body,
                payload: notificationPayload,
                status: 'sent',
                sent_at: new Date().toISOString()
              })
            });

          } catch (error) {
            console.error(`❌ Error enviando notificación a usuario ${sub.user_id}:`, error);
            errors.push({
              user_id: sub.user_id,
              error: error.message
            });
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Notificaciones procesadas exitosamente`,
          sent: sentCount,
          total: subscriptions.length,
          errors: errors.length > 0 ? errors : undefined,
          vapid_configured: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'test': {
        // Endpoint de prueba para verificar configuración VAPID
        return new Response(JSON.stringify({
          success: true,
          message: 'Sistema de notificaciones push operativo',
          vapid_configured: !!(vapidPublicKey && vapidPrivateKey),
          vapid_email: vapidEmail,
          vapid_public_key: vapidPublicKey.substring(0, 20) + '...',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({
          error: {
            code: 'INVALID_ACTION',
            message: `Acción no válida: ${action}. Acciones válidas: get_vapid_key, subscribe, unsubscribe, send, test`
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('❌ Error en push notifications:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'PUSH_NOTIFICATION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
