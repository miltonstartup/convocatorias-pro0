// Edge Function: background-sync
// Sistema de sincronización en background para PWA
// Procesa acciones en cola cuando el usuario recupera conectividad

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
    console.log('🔄 BACKGROUND SYNC - Procesando sincronización...');
    
    const requestData = await req.json();
    const { action, actions, userId } = requestData;

    // Configuración de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    console.log('👤 Usuario:', authenticatedUserId || 'Anónimo');
    console.log('🔧 Acción:', action);

    switch (action) {
      case 'queue_action':
        return await handleQueueAction(actions, authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'process_pending':
        return await handleProcessPending(authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'get_pending':
        return await handleGetPending(authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'clear_processed':
        return await handleClearProcessed(authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      default:
        throw new Error('Acción no válida');
    }

  } catch (error) {
    console.error('❌ Error en background-sync:', error);

    const errorResponse = {
      error: {
        code: 'BACKGROUND_SYNC_ERROR',
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

// Agregar acción a la cola para sincronización posterior
async function handleQueueAction(actions, userId, supabaseUrl, serviceRoleKey) {
  console.log('📋 Agregando acciones a la cola...');
  
  if (!actions || !Array.isArray(actions)) {
    throw new Error('Se requiere un array de acciones');
  }

  const actionsToQueue = actions.map(actionData => ({
    user_id: userId,
    action_type: actionData.type,
    data: actionData.data,
    status: 'pending',
    created_at: new Date().toISOString()
  }));

  const response = await fetch(`${supabaseUrl}/rest/v1/offline_actions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(actionsToQueue)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error agregando acciones a la cola: ${errorText}`);
  }

  console.log(`✅ ${actionsToQueue.length} acciones agregadas a la cola`);

  return new Response(JSON.stringify({ 
    data: { 
      queued: actionsToQueue.length,
      message: 'Acciones agregadas a la cola para sincronización'
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Procesar acciones pendientes
async function handleProcessPending(userId, supabaseUrl, serviceRoleKey) {
  console.log('⚙️ Procesando acciones pendientes...');
  
  if (!userId) {
    throw new Error('ID de usuario requerido');
  }

  // Obtener acciones pendientes del usuario
  const pendingResponse = await fetch(`${supabaseUrl}/rest/v1/offline_actions?user_id=eq.${userId}&status=eq.pending&order=created_at.asc`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });

  if (!pendingResponse.ok) {
    throw new Error('Error obteniendo acciones pendientes');
  }

  const pendingActions = await pendingResponse.json();
  
  if (pendingActions.length === 0) {
    return new Response(JSON.stringify({ 
      data: { 
        processed: 0,
        message: 'No hay acciones pendientes'
      } 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`📋 Encontradas ${pendingActions.length} acciones pendientes`);

  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  // Procesar cada acción
  for (const action of pendingActions) {
    results.processed++;
    
    try {
      const processResult = await processOfflineAction(action, supabaseUrl, serviceRoleKey);
      
      if (processResult.success) {
        results.succeeded++;
        
        // Marcar como procesada exitosamente
        await fetch(`${supabaseUrl}/rest/v1/offline_actions?id=eq.${action.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'completed',
            processed_at: new Date().toISOString()
          })
        });
        
        console.log(`✅ Acción ${action.id} procesada exitosamente`);
      } else {
        throw new Error(processResult.error);
      }
      
    } catch (error) {
      results.failed++;
      results.errors.push(`Acción ${action.id}: ${error.message}`);
      
      // Marcar como fallida
      await fetch(`${supabaseUrl}/rest/v1/offline_actions?id=eq.${action.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'failed',
          processed_at: new Date().toISOString(),
          error_message: error.message
        })
      });
      
      console.error(`❌ Error procesando acción ${action.id}:`, error.message);
    }
  }

  console.log(`📊 Sincronización completada: ${results.succeeded} exitosas, ${results.failed} fallidas`);

  return new Response(JSON.stringify({ 
    data: results
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Procesar una acción offline específica
async function processOfflineAction(action, supabaseUrl, serviceRoleKey) {
  console.log(`🔄 Procesando acción tipo: ${action.action_type}`);
  
  switch (action.action_type) {
    case 'create_convocatoria':
      return await processCreateConvocatoria(action.data, supabaseUrl, serviceRoleKey);
    
    case 'update_convocatoria':
      return await processUpdateConvocatoria(action.data, supabaseUrl, serviceRoleKey);
    
    case 'delete_convocatoria':
      return await processDeleteConvocatoria(action.data, supabaseUrl, serviceRoleKey);
    
    case 'save_search':
      return await processSaveSearch(action.data, supabaseUrl, serviceRoleKey);
    
    case 'update_preferences':
      return await processUpdatePreferences(action.data, supabaseUrl, serviceRoleKey);
    
    default:
      throw new Error(`Tipo de acción no soportado: ${action.action_type}`);
  }
}

// Procesar creación de convocatoria
async function processCreateConvocatoria(data, supabaseUrl, serviceRoleKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/convocatorias`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error creando convocatoria: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Procesar actualización de convocatoria
async function processUpdateConvocatoria(data, supabaseUrl, serviceRoleKey) {
  try {
    const { id, ...updateData } = data;
    
    const response = await fetch(`${supabaseUrl}/rest/v1/convocatorias?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error actualizando convocatoria: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Procesar eliminación de convocatoria
async function processDeleteConvocatoria(data, supabaseUrl, serviceRoleKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/convocatorias?id=eq.${data.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error eliminando convocatoria: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Procesar guardado de búsqueda
async function processSaveSearch(data, supabaseUrl, serviceRoleKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/user_analytics`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: data.user_id,
        event_type: 'search_performed',
        event_data: data,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error guardando búsqueda: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Procesar actualización de preferencias
async function processUpdatePreferences(data, supabaseUrl, serviceRoleKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/email_alert_preferences?user_id=eq.${data.user_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data.preferences)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error actualizando preferencias: ${errorText}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Obtener acciones pendientes
async function handleGetPending(userId, supabaseUrl, serviceRoleKey) {
  if (!userId) {
    throw new Error('ID de usuario requerido');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/offline_actions?user_id=eq.${userId}&status=eq.pending&order=created_at.asc`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });

  if (!response.ok) {
    throw new Error('Error obteniendo acciones pendientes');
  }

  const pendingActions = await response.json();

  return new Response(JSON.stringify({ 
    data: {
      pending_actions: pendingActions,
      count: pendingActions.length
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Limpiar acciones procesadas
async function handleClearProcessed(userId, supabaseUrl, serviceRoleKey) {
  if (!userId) {
    throw new Error('ID de usuario requerido');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/offline_actions?user_id=eq.${userId}&status=eq.completed`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });

  if (!response.ok) {
    throw new Error('Error limpiando acciones procesadas');
  }

  return new Response(JSON.stringify({ 
    data: {
      message: 'Acciones procesadas limpiadas exitosamente'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}