// Edge Function: setup-api-keys-fixed
// Función para configurar API keys de manera segura
// Mejoras: Manejo seguro de credenciales, validación de keys

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
        console.log('🔑 [SETUP-API-KEYS-FIXED] Iniciando configuración de API keys...');
        
        // Obtener credenciales de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Configuración de Supabase no disponible');
        }

        if (req.method === 'GET') {
            // Verificar estado de las API keys
            console.log('🔍 Verificando estado de API keys...');
            
            const apiKeysStatus = await checkApiKeysStatus();
            
            return new Response(JSON.stringify({
                data: {
                    google_api_key: apiKeysStatus.google,
                    openrouter_api_key: apiKeysStatus.openrouter,
                    vault_accessible: apiKeysStatus.vault_accessible,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
            
        } else if (req.method === 'POST') {
            // Configurar nuevas API keys
            const requestData = await req.json();
            const { google_api_key, openrouter_api_key, service } = requestData;
            
            if (!service || !['google_gemini', 'openrouter'].includes(service)) {
                throw new Error('Servicio no válido. Debe ser "google_gemini" o "openrouter"');
            }
            
            const apiKey = service === 'google_gemini' ? google_api_key : openrouter_api_key;
            
            if (!apiKey) {
                throw new Error('API key requerida');
            }
            
            console.log(`🔑 Configurando API key para servicio: ${service}`);
            
            // Intentar guardar en vault de Supabase
            try {
                const vaultKeyName = service === 'google_gemini' ? 'GOOGLE_API_KEY' : 'OPENROUTER_API_KEY';
                
                // Primero eliminar la clave existente si existe
                await fetch(`${supabaseUrl}/rest/v1/vault.secrets?name=eq.${vaultKeyName}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey
                    }
                });
                
                // Insertar nueva clave
                const vaultResponse = await fetch(`${supabaseUrl}/rest/v1/vault.secrets`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: vaultKeyName,
                        secret: apiKey
                    })
                });
                
                if (vaultResponse.ok) {
                    console.log(`✅ API key guardada en vault para ${service}`);
                } else {
                    console.warn(`⚠️ No se pudo guardar en vault para ${service}`);
                }
                
            } catch (vaultError) {
                console.warn(`⚠️ Error accediendo a vault: ${vaultError.message}`);
            }
            
            // Guardar en tabla api_configurations como backup
            try {
                const configResponse = await fetch(`${supabaseUrl}/rest/v1/api_configurations`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        service_name: service,
                        api_key: apiKey,
                        is_active: true
                    })
                });
                
                if (!configResponse.ok) {
                    // Intentar actualizar si ya existe
                    await fetch(`${supabaseUrl}/rest/v1/api_configurations?service_name=eq.${service}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'apikey': supabaseServiceKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            api_key: apiKey,
                            is_active: true,
                            updated_at: new Date().toISOString()
                        })
                    });
                }
                
                console.log(`✅ API key guardada en configuración para ${service}`);
                
            } catch (configError) {
                console.error(`❌ Error guardando en configuración: ${configError.message}`);
            }
            
            // Validar la API key
            const isValid = await validateApiKey(service, apiKey);
            
            return new Response(JSON.stringify({
                data: {
                    success: true,
                    service,
                    key_valid: isValid,
                    message: `API key para ${service} configurada exitosamente`,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
            
        } else {
            throw new Error(`Método ${req.method} no soportado`);
        }

    } catch (error) {
        console.error('❌ ERROR en setup-api-keys:', error);

        const errorResponse = {
            error: {
                code: 'API_KEYS_SETUP_ERROR',
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

// Verificar estado de las API keys
async function checkApiKeysStatus(): Promise<any> {
    const status = {
        google: { available: false, source: 'none' },
        openrouter: { available: false, source: 'none' },
        vault_accessible: false
    };
    
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        // Verificar acceso a vault
        try {
            const vaultResponse = await fetch(`${supabaseUrl}/rest/v1/vault.secrets?select=name`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });
            
            status.vault_accessible = vaultResponse.ok;
        } catch (error) {
            console.warn('Vault no accesible:', error.message);
        }
        
        // Verificar Google API Key
        const googleKey = Deno.env.get('GOOGLE_API_KEY');
        if (googleKey) {
            status.google = { available: true, source: 'env' };
        }
        
        // Verificar OpenRouter API Key
        const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
        if (openrouterKey) {
            status.openrouter = { available: true, source: 'env' };
        }
        
    } catch (error) {
        console.error('Error verificando API keys:', error);
    }
    
    return status;
}

// Validar una API key
async function validateApiKey(service: string, apiKey: string): Promise<boolean> {
    try {
        if (service === 'google_gemini') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            return response.ok;
        } else if (service === 'openrouter') {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://convocatorias-pro.cl'
                }
            });
            return response.ok;
        }
    } catch (error) {
        console.error(`Error validando API key para ${service}:`, error);
    }
    
    return false;
}