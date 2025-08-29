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
    // Configurar la GOOGLE_API_KEY como variable de entorno
    const result = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/set_config`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        setting_name: 'app.google_api_key',
        setting_value: 'AIzaSyBTmZoy4GKloRkBBN5fqnMHV13sy3WDUIs'
      })
    });

    // También intentar configurar como secret del proyecto
    const secretResult = await fetch(`https://api.supabase.com/v1/projects/${Deno.env.get('SUPABASE_PROJECT_REF')}/secrets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'GOOGLE_API_KEY',
        value: 'AIzaSyBTmZoy4GKloRkBBN5fqnMHV13sy3WDUIs'
      })
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'GOOGLE_API_KEY configurada exitosamente',
      config_result: result.ok,
      secret_result: secretResult.ok
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error configurando GOOGLE_API_KEY:', error);
    return new Response(JSON.stringify({ 
      error: 'Error configurando GOOGLE_API_KEY',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});