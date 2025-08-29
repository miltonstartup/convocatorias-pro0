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
    const { user_id, pending_operations, sync_type } = await req.json();
    
    // Obtener variables de entorno
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Variables de entorno de Supabase no configuradas');
    }

    if (!user_id) {
      throw new Error('user_id es requerido');
    }

    console.log(`Iniciando sincronización en segundo plano para usuario: ${user_id}`);
    console.log(`Tipo de sincronización: ${sync_type || 'general'}`);
    console.log(`Operaciones pendientes recibidas: ${pending_operations?.length || 0}`);
    
    const processedItems = [];
    const failedItems = [];
    let totalProcessed = 0;

    // Procesar operaciones pendientes
    if (pending_operations && pending_operations.length > 0) {
      for (const operation of pending_operations) {
        try {
          console.log(`Procesando operación: ${operation.type}`, operation);
          
          let result;
          
          switch (operation.type) {
            case 'save_convocatoria': {
              // Guardar convocatoria que se creó offline
              const convocatoriaData = {
                ...operation.data,
                user_id,
                created_at: operation.timestamp || new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_synced: true
              };

              const response = await fetch(`${supabaseUrl}/rest/v1/convocatorias`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceRoleKey
                },
                body: JSON.stringify(convocatoriaData)
              });

              if (!response.ok) {
                throw new Error(`Error guardando convocatoria: ${await response.text()}`);
              }

              result = await response.json();
              break;
            }

            case 'update_convocatoria': {
              // Actualizar convocatoria modificada offline
              const { id, ...updateData } = operation.data;
              
              const response = await fetch(`${supabaseUrl}/rest/v1/convocatorias?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceRoleKey
                },
                body: JSON.stringify({
                  ...updateData,
                  updated_at: new Date().toISOString(),
                  is_synced: true
                })
              });

              if (!response.ok) {
                throw new Error(`Error actualizando convocatoria: ${await response.text()}`);
              }

              result = await response.json();
              break;
            }

            case 'save_search': {
              // Guardar búsqueda realizada offline
              const searchData = {
                user_id,
                query: operation.data.query,
                filters: operation.data.filters,
                results_count: operation.data.results_count || 0,
                created_at: operation.timestamp || new Date().toISOString(),
                is_synced: true
              };

              const response = await fetch(`${supabaseUrl}/rest/v1/ai_searches`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceRoleKey
                },
                body: JSON.stringify(searchData)
              });

              if (!response.ok) {
                throw new Error(`Error guardando búsqueda: ${await response.text()}`);
              }

              result = await response.json();
              break;
            }

            case 'track_analytics': {
              // Enviar datos de analytics acumulados offline
              const analyticsData = {
                user_id,
                event_type: operation.data.event_type,
                event_data: operation.data.event_data,
                page_url: operation.data.page_url,
                user_agent: operation.data.user_agent,
                created_at: operation.timestamp || new Date().toISOString()
              };

              const response = await fetch(`${supabaseUrl}/rest/v1/user_analytics`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceRoleKey
                },
                body: JSON.stringify(analyticsData)
              });

              if (!response.ok) {
                throw new Error(`Error guardando analytics: ${await response.text()}`);
              }

              result = await response.json();
              break;
            }

            case 'update_settings': {
              // Sincronizar configuraciones cambiadas offline
              const response = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${user_id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceRoleKey}`,
                  'Content-Type': 'application/json',
                  'apikey': supabaseServiceRoleKey
                },
                body: JSON.stringify({
                  ...operation.data,
                  updated_at: new Date().toISOString()
                })
              });

              if (!response.ok) {
                throw new Error(`Error actualizando configuraciones: ${await response.text()}`);
              }

              result = await response.json();
              break;
            }

            default:
              console.warn(`Tipo de operación no soportado: ${operation.type}`);
              result = { warning: 'Tipo de operación no soportado' };
          }
          
          processedItems.push({
            id: operation.id,
            type: operation.type,
            status: 'success',
            result,
            processedAt: new Date().toISOString()
          });
          
          totalProcessed++;
          
        } catch (operationError) {
          console.error(`Error procesando operación ${operation.type}:`, operationError);
          
          failedItems.push({
            id: operation.id,
            type: operation.type,
            status: 'error',
            error: operationError.message,
            data: operation.data
          });
        }
      }
    }

    // Registrar sincronización en la base de datos
    const syncLogData = {
      user_id,
      sync_type: sync_type || 'background_sync',
      operations_processed: totalProcessed,
      operations_failed: failedItems.length,
      sync_details: {
        processed_items: processedItems,
        failed_items: failedItems,
        sync_timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };

    await fetch(`${supabaseUrl}/rest/v1/sync_logs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceRoleKey
      },
      body: JSON.stringify(syncLogData)
    });

    // Limpiar operaciones procesadas exitosamente del cliente
    const successfulIds = processedItems
      .filter(item => item.status === 'success')
      .map(item => item.id);

    const summary = {
      success: true,
      message: 'Sincronización en segundo plano completada',
      data: {
        user_id,
        sync_type: sync_type || 'background_sync',
        totalOperations: pending_operations?.length || 0,
        processedSuccessfully: totalProcessed,
        failed: failedItems.length,
        processedItems,
        failedItems: failedItems.length > 0 ? failedItems : undefined,
        clearFromClient: successfulIds,
        syncTimestamp: new Date().toISOString()
      }
    };

    console.log('Sincronización completada:', summary.data);
    
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error en background sync:', error);
    
    return new Response(JSON.stringify({
      error: {
        code: 'BACKGROUND_SYNC_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});