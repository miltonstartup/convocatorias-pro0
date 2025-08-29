// Edge Function: analytics-dashboard
// Dashboard de analytics avanzado para ConvocatoriasPro
// Genera métricas, tendencias y reportes exportables

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
    console.log('📊 ANALYTICS DASHBOARD - Procesando solicitud...');
    
    const requestData = await req.json();
    const { action, timeRange, metrics, exportFormat, comparisonPeriod } = requestData;

    // Configuración de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuración de Supabase incompleta');
    }

    // Verificar autenticación del usuario
    const authHeader = req.headers.get('authorization');
    let authenticatedUserId = null;
    let userPlan = 'free';
    
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
          
          // Obtener plan del usuario
          const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${authenticatedUserId}&select=plan`, {
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            }
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            if (profileData.length > 0) {
              userPlan = profileData[0].plan || 'free';
            }
          }
        }
      } catch (error) {
        console.warn('Error verificando autenticación:', error.message);
      }
    }

    if (!authenticatedUserId) {
      throw new Error('Autenticación requerida');
    }

    console.log('👤 Usuario:', authenticatedUserId, `(${userPlan})`);
    console.log('🔧 Acción:', action);

    // Verificar permisos para funcionalidades premium
    const isPremium = userPlan.includes('pro');
    
    switch (action) {
      case 'track_event':
        return await handleTrackEvent(requestData, authenticatedUserId, supabaseUrl, serviceRoleKey, req);
      
      case 'get_overview':
        return await handleGetOverview(timeRange, authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'get_detailed_metrics':
        if (!isPremium) {
          throw new Error('Esta funcionalidad requiere plan Pro');
        }
        return await handleGetDetailedMetrics(metrics, timeRange, authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'get_trends':
        return await handleGetTrends(timeRange, authenticatedUserId, supabaseUrl, serviceRoleKey, isPremium);
      
      case 'get_comparisons':
        if (!isPremium) {
          throw new Error('Esta funcionalidad requiere plan Pro');
        }
        return await handleGetComparisons(timeRange, comparisonPeriod, authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'export_report':
        if (!isPremium) {
          throw new Error('Esta funcionalidad requiere plan Pro');
        }
        return await handleExportReport(exportFormat, timeRange, metrics, authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      case 'get_insights':
        if (!isPremium) {
          throw new Error('Esta funcionalidad requiere plan Pro');
        }
        return await handleGetInsights(authenticatedUserId, supabaseUrl, serviceRoleKey);
      
      default:
        throw new Error('Acción no válida');
    }

  } catch (error) {
    console.error('❌ Error en analytics-dashboard:', error);

    const errorResponse = {
      error: {
        code: 'ANALYTICS_DASHBOARD_ERROR',
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

// Rastrear evento de usuario
async function handleTrackEvent(eventData, userId, supabaseUrl, serviceRoleKey, req) {
  console.log('📈 Rastreando evento de usuario...');
  
  const { event_type, event_data = {}, session_id } = eventData;
  
  if (!event_type) {
    throw new Error('Tipo de evento requerido');
  }

  const analyticsEvent = {
    user_id: userId,
    event_type,
    event_data,
    session_id: session_id || crypto.randomUUID(),
    ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
    created_at: new Date().toISOString()
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/user_analytics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(analyticsEvent)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error guardando evento: ${errorText}`);
  }

  return new Response(JSON.stringify({ 
    data: { 
      success: true,
      event_id: crypto.randomUUID(),
      message: 'Evento rastreado exitosamente'
    } 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Obtener resumen general
async function handleGetOverview(timeRange = '30d', userId, supabaseUrl, serviceRoleKey) {
  console.log('📋 Obteniendo resumen general...');
  
  const dateFrom = getDateFromRange(timeRange);
  
  // Métricas básicas de convocatorias
  const convocatoriasResponse = await fetch(`${supabaseUrl}/rest/v1/convocatorias?user_id=eq.${userId}&created_at=gte.${dateFrom}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  const convocatorias = await convocatoriasResponse.json();
  
  // Métricas de eventos de usuario
  const eventsResponse = await fetch(`${supabaseUrl}/rest/v1/user_analytics?user_id=eq.${userId}&created_at=gte.${dateFrom}`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  const events = await eventsResponse.json();
  
  // Calcular métricas
  const overview = {
    period: timeRange,
    date_range: {
      from: dateFrom,
      to: new Date().toISOString()
    },
    convocatorias: {
      total: convocatorias.length,
      abiertas: convocatorias.filter(c => c.estado === 'abierto').length,
      cerradas: convocatorias.filter(c => c.estado === 'cerrado').length,
      en_evaluacion: convocatorias.filter(c => c.estado === 'en_evaluacion').length
    },
    actividad: {
      total_events: events.length,
      unique_sessions: new Set(events.map(e => e.session_id)).size,
      searches_performed: events.filter(e => e.event_type === 'search_performed').length,
      convocatorias_viewed: events.filter(e => e.event_type === 'convocatoria_viewed').length,
      exports_generated: events.filter(e => e.event_type === 'export_generated').length
    },
    top_areas: getTopAreas(convocatorias),
    top_institutions: getTopInstitutions(convocatorias)
  };
  
  return new Response(JSON.stringify({ 
    data: overview
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Obtener métricas detalladas (solo Pro)
async function handleGetDetailedMetrics(requestedMetrics, timeRange, userId, supabaseUrl, serviceRoleKey) {
  console.log('📉 Obteniendo métricas detalladas...');
  
  const dateFrom = getDateFromRange(timeRange);
  
  const metrics = {};
  
  // Métricas de tiempo de respuesta
  if (requestedMetrics.includes('response_times')) {
    metrics.response_times = await getResponseTimeMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey);
  }
  
  // Métricas de éxito de búsquedas
  if (requestedMetrics.includes('search_success')) {
    metrics.search_success = await getSearchSuccessMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey);
  }
  
  // Métricas de retención
  if (requestedMetrics.includes('retention')) {
    metrics.retention = await getRetentionMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey);
  }
  
  // Métricas de uso de funcionalidades
  if (requestedMetrics.includes('feature_usage')) {
    metrics.feature_usage = await getFeatureUsageMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey);
  }
  
  return new Response(JSON.stringify({ 
    data: {
      metrics,
      period: timeRange,
      generated_at: new Date().toISOString()
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Obtener tendencias temporales
async function handleGetTrends(timeRange, userId, supabaseUrl, serviceRoleKey, isPremium) {
  console.log('📈 Obteniendo tendencias temporales...');
  
  const dateFrom = getDateFromRange(timeRange);
  
  // Obtener datos de convocatorias por día
  const convocatoriasResponse = await fetch(`${supabaseUrl}/rest/v1/convocatorias?user_id=eq.${userId}&created_at=gte.${dateFrom}&order=created_at`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  const convocatorias = await convocatoriasResponse.json();
  
  // Obtener datos de eventos por día
  const eventsResponse = await fetch(`${supabaseUrl}/rest/v1/user_analytics?user_id=eq.${userId}&created_at=gte.${dateFrom}&order=created_at`, {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey
    }
  });
  
  const events = await eventsResponse.json();
  
  // Generar series temporales
  const trends = {
    convocatorias_created: generateTimeSeries(convocatorias, 'created_at', timeRange),
    user_activity: generateTimeSeries(events, 'created_at', timeRange),
    search_activity: generateTimeSeries(events.filter(e => e.event_type === 'search_performed'), 'created_at', timeRange)
  };
  
  // Añadir tendencias premium
  if (isPremium) {
    trends.conversion_rates = await getConversionTrends(userId, dateFrom, supabaseUrl, serviceRoleKey);
    trends.engagement_scores = await getEngagementTrends(userId, dateFrom, supabaseUrl, serviceRoleKey);
  }
  
  return new Response(JSON.stringify({ 
    data: {
      trends,
      period: timeRange,
      is_premium: isPremium
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Obtener comparaciones (solo Pro)
async function handleGetComparisons(timeRange, comparisonPeriod, userId, supabaseUrl, serviceRoleKey) {
  console.log('🔄 Obteniendo comparaciones...');
  
  const currentPeriod = getDateFromRange(timeRange);
  const previousPeriod = getDateFromRange(comparisonPeriod || timeRange, true);
  
  // Datos del período actual
  const currentData = await getPeriodData(userId, currentPeriod, new Date().toISOString(), supabaseUrl, serviceRoleKey);
  
  // Datos del período anterior
  const previousData = await getPeriodData(userId, previousPeriod, currentPeriod, supabaseUrl, serviceRoleKey);
  
  // Calcular comparaciones
  const comparisons = {
    convocatorias_created: {
      current: currentData.convocatorias.length,
      previous: previousData.convocatorias.length,
      change_percent: calculatePercentChange(previousData.convocatorias.length, currentData.convocatorias.length)
    },
    user_sessions: {
      current: new Set(currentData.events.map(e => e.session_id)).size,
      previous: new Set(previousData.events.map(e => e.session_id)).size,
      change_percent: calculatePercentChange(
        new Set(previousData.events.map(e => e.session_id)).size,
        new Set(currentData.events.map(e => e.session_id)).size
      )
    },
    searches_performed: {
      current: currentData.events.filter(e => e.event_type === 'search_performed').length,
      previous: previousData.events.filter(e => e.event_type === 'search_performed').length,
      change_percent: calculatePercentChange(
        previousData.events.filter(e => e.event_type === 'search_performed').length,
        currentData.events.filter(e => e.event_type === 'search_performed').length
      )
    }
  };
  
  return new Response(JSON.stringify({ 
    data: {
      comparisons,
      current_period: { from: currentPeriod, to: new Date().toISOString() },
      previous_period: { from: previousPeriod, to: currentPeriod }
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Exportar reporte (solo Pro)
async function handleExportReport(format, timeRange, metrics, userId, supabaseUrl, serviceRoleKey) {
  console.log('📊 Exportando reporte...');
  
  // Obtener todos los datos necesarios
  const overviewData = await handleGetOverview(timeRange, userId, supabaseUrl, serviceRoleKey);
  const overview = JSON.parse(await overviewData.text()).data;
  
  if (format === 'csv') {
    const csvData = generateCSVReport(overview);
    
    return new Response(csvData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="convocatorias-report-${timeRange}.csv"`
      }
    });
  } else if (format === 'json') {
    return new Response(JSON.stringify({
      data: {
        report: overview,
        exported_at: new Date().toISOString(),
        format: 'json'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="convocatorias-report-${timeRange}.json"`
      }
    });
  } else {
    throw new Error('Formato de exportación no soportado');
  }
}

// Obtener insights con IA (solo Pro)
async function handleGetInsights(userId, supabaseUrl, serviceRoleKey) {
  console.log('🤖 Generando insights con IA...');
  
  // Obtener datos de los últimos 30 días
  const dateFrom = getDateFromRange('30d');
  
  const data = await getPeriodData(userId, dateFrom, new Date().toISOString(), supabaseUrl, serviceRoleKey);
  
  // Generar insights basados en patrones
  const insights = {
    productivity: generateProductivityInsights(data),
    opportunities: generateOpportunityInsights(data),
    recommendations: generateRecommendations(data),
    alerts: generateAlerts(data)
  };
  
  return new Response(JSON.stringify({ 
    data: {
      insights,
      generated_at: new Date().toISOString(),
      data_period: '30d'
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Funciones auxiliares

function getDateFromRange(range, isPrevious = false) {
  const now = new Date();
  let days = 30;
  
  switch (range) {
    case '7d': days = 7; break;
    case '30d': days = 30; break;
    case '90d': days = 90; break;
    case '1y': days = 365; break;
    default: days = 30;
  }
  
  if (isPrevious) {
    days = days * 2; // Período anterior
  }
  
  const date = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  return date.toISOString();
}

function getTopAreas(convocatorias) {
  const areas = {};
  convocatorias.forEach(c => {
    const area = c.area || 'Sin área';
    areas[area] = (areas[area] || 0) + 1;
  });
  
  return Object.entries(areas)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([area, count]) => ({ area, count }));
}

function getTopInstitutions(convocatorias) {
  const institutions = {};
  convocatorias.forEach(c => {
    const inst = c.institucion || 'Sin institución';
    institutions[inst] = (institutions[inst] || 0) + 1;
  });
  
  return Object.entries(institutions)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([institution, count]) => ({ institution, count }));
}

function generateTimeSeries(data, dateField, timeRange) {
  const series = {};
  const groupBy = timeRange === '7d' ? 'day' : timeRange === '30d' ? 'day' : 'week';
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const key = groupBy === 'day' 
      ? date.toISOString().split('T')[0]
      : `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
    
    series[key] = (series[key] || 0) + 1;
  });
  
  return Object.entries(series)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

async function getPeriodData(userId, dateFrom, dateTo, supabaseUrl, serviceRoleKey) {
  const [convocatoriasResponse, eventsResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/convocatorias?user_id=eq.${userId}&created_at=gte.${dateFrom}&created_at=lt.${dateTo}`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    }),
    fetch(`${supabaseUrl}/rest/v1/user_analytics?user_id=eq.${userId}&created_at=gte.${dateFrom}&created_at=lt.${dateTo}`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    })
  ]);
  
  const [convocatorias, events] = await Promise.all([
    convocatoriasResponse.json(),
    eventsResponse.json()
  ]);
  
  return { convocatorias, events };
}

function calculatePercentChange(previous, current) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function generateCSVReport(data) {
  const rows = [
    ['Métrica', 'Valor'],
    ['Total Convocatorias', data.convocatorias.total],
    ['Convocatorias Abiertas', data.convocatorias.abiertas],
    ['Convocatorias Cerradas', data.convocatorias.cerradas],
    ['Total Eventos', data.actividad.total_events],
    ['Sesiones Únicas', data.actividad.unique_sessions],
    ['Búsquedas Realizadas', data.actividad.searches_performed]
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

function generateProductivityInsights(data) {
  return {
    peak_activity_day: 'Lunes', // Calcular basado en datos reales
    avg_convocatorias_per_week: Math.round(data.convocatorias.length / 4),
    most_active_time: '14:00-16:00'
  };
}

function generateOpportunityInsights(data) {
  return {
    trending_areas: ['Tecnología', 'Innovación', 'Sustentabilidad'],
    upcoming_deadlines: data.convocatorias.filter(c => {
      const deadline = new Date(c.fecha_cierre);
      const now = new Date();
      const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
      return diffDays > 0 && diffDays <= 7;
    }).length
  };
}

function generateRecommendations(data) {
  return [
    'Considera configurar alertas para convocatorias de tecnología',
    'Revisa las convocatorias que vencen esta semana',
    'Explora nuevas áreas de financiamiento'
  ];
}

function generateAlerts(data) {
  const alerts = [];
  
  if (data.convocatorias.length === 0) {
    alerts.push({
      type: 'warning',
      message: 'No has agregado convocatorias recientemente'
    });
  }
  
  return alerts;
}

// Funciones placeholder para métricas avanzadas
async function getResponseTimeMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey) {
  return { avg_response_time: '0.5s', p95_response_time: '1.2s' };
}

async function getSearchSuccessMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey) {
  return { success_rate: '95%', avg_results_per_search: 8.5 };
}

async function getRetentionMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey) {
  return { weekly_retention: '85%', monthly_retention: '72%' };
}

async function getFeatureUsageMetrics(userId, dateFrom, supabaseUrl, serviceRoleKey) {
  return {
    search_usage: '78%',
    export_usage: '45%',
    calendar_sync_usage: '23%'
  };
}

async function getConversionTrends(userId, dateFrom, supabaseUrl, serviceRoleKey) {
  return [{ date: '2025-08-10', rate: 0.15 }, { date: '2025-08-17', rate: 0.18 }];
}

async function getEngagementTrends(userId, dateFrom, supabaseUrl, serviceRoleKey) {
  return [{ date: '2025-08-10', score: 7.2 }, { date: '2025-08-17', score: 7.8 }];
}