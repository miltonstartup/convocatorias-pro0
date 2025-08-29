// Edge Function: google-calendar-sync
// Integración completa con Google Calendar para sincronizar convocatorias
// Maneja OAuth, creación de eventos y configuración de recordatorios

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
    console.log('📅 GOOGLE CALENDAR SYNC - Procesando solicitud...');
    
    const requestData = await req.json();
    const { action, convocatoria, config, code, calendarId } = requestData;

    // Configuración de Supabase y Google
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = 'https://67wxko2mslhe.space.minimax.io/auth/google/callback';

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de Supabase incompleta');
    }

    // Verificar autenticación del usuario
    const authHeader = req.headers.get('authorization');
    let authenticatedUserId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': serviceRoleKey
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          authenticatedUserId = userData.id;
        }
      } catch (error) {
        console.warn('Error verificando autenticación:', error.message);
      }
    }

    if (!authenticatedUserId) {
      throw new Error('Autenticación requerida');
    }

    console.log('👤 Usuario:', authenticatedUserId);
    console.log('🔧 Acción:', action);

    switch (action) {
      case 'get_auth_url':
        return await handleGetAuthUrl(googleClientId, redirectUri);
      
      case 'exchange_code':
        return await handleExchangeCode(code, authenticatedUserId, googleClientId, googleClientSecret, redirectUri, supabaseUrl, serviceRoleKey);
      
      case 'get_calendars':
        return await handleGetCalendars(authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'sync_convocatoria':
        return await handleSyncConvocatoria(convocatoria, authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'update_config':
        return await handleUpdateConfig(config, authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'get_config':
        return await handleGetConfig(authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'disconnect':
        return await handleDisconnect(authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      default:
        throw new Error('Acción no válida');
    }

  } catch (error) {
    console.error('❌ Error en google-calendar-sync:', error);

    const errorResponse = {
      error: {
        code: 'GOOGLE_CALENDAR_ERROR',
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

// Obtener URL de autorización de Google
async function handleGetAuthUrl(clientId, redirectUri) {
  console.log('🔗 Generando URL de autorización de Google...');
  
  if (!clientId) {
    throw new Error('Google Client ID no configurado');
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', crypto.randomUUID());

  return new Response(JSON.stringify({ 
    data: { 
      auth_url: authUrl.toString()
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Intercambiar código por tokens
async function handleExchangeCode(code, userId, clientId, clientSecret, redirectUri, supabaseUrl, serviceRoleKey) {
  console.log('🔄 Intercambiando código por tokens...');
  
  if (!code) {
    throw new Error('Código de autorización requerido');
  }

  if (!clientId || !clientSecret) {
    throw new Error('Credenciales de Google no configuradas');
  }

  // Intercambiar código por tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    throw new Error(`Error intercambiando código: ${errorData}`);
  }

  const tokens = await tokenResponse.json();
  
  // Obtener información del usuario de Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`
    }
  });
  
  const userInfo = await userInfoResponse.json();
  
  // Guardar tokens en la base de datos
  const integrationData = {
    user_id: userId,
    google_calendar_enabled: true,
    google_access_token: tokens.access_token,
    google_refresh_token: tokens.refresh_token,
    updated_at: new Date().toISOString()
  };

  // Verificar si ya existe una integración
  const existingResponse = await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  const existingIntegrations = await existingResponse.json();
  
  if (existingIntegrations.length > 0) {
    // Actualizar integración existente
    await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(integrationData)
    });
  } else {
    // Crear nueva integración
    await fetch(`${supabaseUrl}/rest/v1/calendar_integrations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(integrationData)
    });
  }

  console.log('✅ Integración con Google Calendar configurada');

  return new Response(JSON.stringify({ 
    data: { 
      success: true,
      user_info: {
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
      },
      message: 'Integración con Google Calendar configurada exitosamente'
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Obtener calendarios del usuario
async function handleGetCalendars(userId, supabaseUrl, serviceRoleKey) {
  console.log('📅 Obteniendo calendarios del usuario...');
  
  // Obtener tokens del usuario
  const integrationResponse = await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  const integrations = await integrationResponse.json();
  
  if (integrations.length === 0 || !integrations[0].google_access_token) {
    throw new Error('Integración con Google Calendar no configurada');
  }
  
  const integration = integrations[0];
  
  // Obtener calendarios de Google
  const calendarsResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      'Authorization': `Bearer ${integration.google_access_token}`
    }
  });
  
  if (!calendarsResponse.ok) {
    // Intentar refrescar token si es necesario
    if (calendarsResponse.status === 401 && integration.google_refresh_token) {
      const newTokens = await refreshGoogleToken(integration.google_refresh_token);
      if (newTokens) {
        // Actualizar tokens en la base de datos
        await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            google_access_token: newTokens.access_token,
            updated_at: new Date().toISOString()
          })
        });
        
        // Reintentar solicitud
        const retryResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: {
            'Authorization': `Bearer ${newTokens.access_token}`
          }
        });
        
        if (retryResponse.ok) {
          const calendarsData = await retryResponse.json();
          
          return new Response(JSON.stringify({ 
            data: { 
              calendars: calendarsData.items || []
            } 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    }
    
    throw new Error('Error obteniendo calendarios de Google');
  }
  
  const calendarsData = await calendarsResponse.json();
  
  return new Response(JSON.stringify({ 
    data: { 
      calendars: calendarsData.items || []
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Sincronizar convocatoria con Google Calendar
async function handleSyncConvocatoria(convocatoria, userId, supabaseUrl, serviceRoleKey) {
  console.log('🔄 Sincronizando convocatoria con Google Calendar...');
  
  if (!convocatoria || !convocatoria.id) {
    throw new Error('Datos de convocatoria requeridos');
  }
  
  // Obtener configuración del usuario
  const integrationResponse = await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  const integrations = await integrationResponse.json();
  
  if (integrations.length === 0 || !integrations[0].google_calendar_enabled) {
    throw new Error('Integración con Google Calendar no habilitada');
  }
  
  const integration = integrations[0];
  
  // Crear evento en Google Calendar
  const event = {
    summary: `${convocatoria.nombre_concurso} - Fecha Límite`,
    description: `Convocatoria: ${convocatoria.nombre_concurso}\n` +
                 `Institución: ${convocatoria.institucion || 'No especificada'}\n` +
                 `Monto: ${convocatoria.monto_financiamiento || 'No especificado'}\n` +
                 `Área: ${convocatoria.area || 'No especificada'}\n\n` +
                 `Gestionado desde ConvocatoriasPro`,
    start: {
      date: convocatoria.fecha_cierre
    },
    end: {
      date: convocatoria.fecha_cierre
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: integration.reminder_minutes || 60 },
        { method: 'popup', minutes: integration.reminder_minutes || 60 }
      ]
    },
    source: {
      title: 'ConvocatoriasPro',
      url: 'https://67wxko2mslhe.space.minimax.io'
    }
  };
  
  const calendarId = integration.default_calendar_id || 'primary';
  
  const eventResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${integration.google_access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });
  
  if (!eventResponse.ok) {
    const errorData = await eventResponse.text();
    throw new Error(`Error creando evento en Google Calendar: ${errorData}`);
  }
  
  const createdEvent = await eventResponse.json();
  
  console.log(`✅ Evento creado en Google Calendar: ${createdEvent.id}`);
  
  return new Response(JSON.stringify({ 
    data: { 
      success: true,
      event_id: createdEvent.id,
      event_url: createdEvent.htmlLink,
      message: 'Convocatoria sincronizada con Google Calendar'
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Actualizar configuración de integración
async function handleUpdateConfig(config, userId, supabaseUrl, serviceRoleKey) {
  console.log('⚙️ Actualizando configuración de integración...');
  
  const updateData = {
    ...config,
    updated_at: new Date().toISOString()
  };
  
  const response = await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    throw new Error('Error actualizando configuración');
  }
  
  return new Response(JSON.stringify({ 
    data: { 
      success: true,
      message: 'Configuración actualizada exitosamente'
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Obtener configuración actual
async function handleGetConfig(userId, supabaseUrl, serviceRoleKey) {
  const response = await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  if (!response.ok) {
    throw new Error('Error obteniendo configuración');
  }
  
  const integrations = await response.json();
  const config = integrations.length > 0 ? integrations[0] : null;
  
  return new Response(JSON.stringify({ 
    data: { 
      config: config ? {
        google_calendar_enabled: config.google_calendar_enabled,
        default_calendar_id: config.default_calendar_id,
        reminder_minutes: config.reminder_minutes,
        sync_deadline_events: config.sync_deadline_events,
        sync_application_events: config.sync_application_events
      } : null
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Desconectar integración
async function handleDisconnect(userId, supabaseUrl, serviceRoleKey) {
  console.log('❌ Desconectando integración con Google Calendar...');
  
  const response = await fetch(`${supabaseUrl}/rest/v1/calendar_integrations?user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      google_calendar_enabled: false,
      google_access_token: null,
      google_refresh_token: null,
      updated_at: new Date().toISOString()
    })
  });
  
  if (!response.ok) {
    throw new Error('Error desconectando integración');
  }
  
  return new Response(JSON.stringify({ 
    data: { 
      success: true,
      message: 'Integración con Google Calendar desconectada'
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Refrescar token de Google
async function refreshGoogleToken(refreshToken) {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      return null;
    }
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error refrescando token:', error);
    return null;
  }
}