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
        console.log('🧠 GESTIÓN MODELOS GEMINI - Procesamiento iniciado');
        
        const requestData = await req.json();
        const { action = 'get', model_configs } = requestData;

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Autenticación del usuario
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Token de autorización requerido');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Token no válido');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        console.log('👤 Usuario autenticado para configuración Gemini:', userId);

        switch (action) {
            case 'get':
                return await getGeminiModelsConfig(userId, supabaseUrl, serviceRoleKey, corsHeaders);
            
            case 'save':
                if (!model_configs) {
                    throw new Error('model_configs es requerido para guardar');
                }
                return await saveGeminiModelsConfig(userId, model_configs, supabaseUrl, serviceRoleKey, corsHeaders);
            
            default:
                throw new Error('Acción no soportada');
        }

    } catch (error) {
        console.error('❌ ERROR en gestión de modelos Gemini:', error);
        
        return new Response(JSON.stringify({
            error: {
                code: 'GEMINI_MODELS_CONFIG_ERROR',
                message: error.message
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Obtener configuración de modelos Gemini
async function getGeminiModelsConfig(userId: string, supabaseUrl: string, serviceRoleKey: string, corsHeaders: any) {
    console.log('📖 Obteniendo configuración de modelos Gemini:', userId);
    
    // Obtener configuración del usuario para modelos Gemini
    const response = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        }
    });

    const userConfigs = response.ok ? await response.json() : [];
    
    // Modelos Gemini disponibles
    const availableGeminiModels = [
        {
            id: 'gemini-2.5-pro',
            name: 'Gemini 2.5 Pro',
            description: 'Modelo avanzado para procesamiento detallado y análisis complejo',
            context_length: 8192,
            best_for: 'Análisis detallado, paso 2 del flujo inteligente',
            pricing: 'Por uso (tokens)',
            enabled: false
        },
        {
            id: 'gemini-2.5-flash-lite',
            name: 'Gemini 2.5 Flash-Lite',
            description: 'Modelo rápido optimizado para respuestas veloces',
            context_length: 4096,
            best_for: 'Generación rápida de listas, paso 1 del flujo inteligente',
            pricing: 'Por uso (tokens)',
            enabled: false
        },
        {
            id: 'gemini-2.0-flash-exp',
            name: 'Gemini 2.0 Flash (Experimental)',
            description: 'Modelo experimental con mejoras de rendimiento',
            context_length: 6144,
            best_for: 'Búsquedas directas, casos generales',
            pricing: 'Gratuito (experimental)',
            enabled: false
        },
        {
            id: 'gemini-1.5-pro',
            name: 'Gemini 1.5 Pro',
            description: 'Modelo estable y confiable para tareas generales',
            context_length: 8192,
            best_for: 'Tareas generales, análisis balanceado',
            pricing: 'Por uso (tokens)',
            enabled: false
        }
    ];
    
    // Aplicar configuración del usuario
    const modelsWithConfig = availableGeminiModels.map(model => {
        const userConfig = userConfigs.find((config: any) => config.model_name === model.id);
        return {
            ...model,
            enabled: userConfig?.enabled || false,
            configured_at: userConfig?.updated_at
        };
    });
    
    // Si no hay configuración, habilitar modelos por defecto
    if (userConfigs.length === 0) {
        modelsWithConfig[0].enabled = true; // Gemini 2.5 Pro
        modelsWithConfig[1].enabled = true; // Gemini 2.5 Flash-Lite
    }
    
    console.log('✅ Configuración de modelos Gemini obtenida');
    
    return new Response(JSON.stringify({
        data: {
            gemini_models: modelsWithConfig,
            ai_providers: {
                openrouter: {
                    name: 'OpenRouter',
                    description: 'Acceso a múltiples modelos de IA gratuitos',
                    status: 'active',
                    models_count: 'Varios modelos gratuitos'
                },
                gemini: {
                    name: 'Google Gemini',
                    description: 'Modelos Gemini directos de Google',
                    status: 'active',
                    models_count: modelsWithConfig.length
                },
                smart_flow: {
                    name: 'Flujo Inteligente',
                    description: 'Proceso automático de 2 pasos con Gemini',
                    status: 'active',
                    requires: ['gemini-2.5-flash-lite', 'gemini-2.5-pro']
                }
            },
            configuration_info: {
                total_providers: 3,
                total_models: modelsWithConfig.length,
                enabled_models: modelsWithConfig.filter(m => m.enabled).length,
                smart_flow_ready: modelsWithConfig.filter(m => 
                    (m.id === 'gemini-2.5-pro' || m.id === 'gemini-2.5-flash-lite') && m.enabled
                ).length === 2
            }
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Guardar configuración de modelos Gemini
async function saveGeminiModelsConfig(userId: string, modelConfigs: any[], supabaseUrl: string, serviceRoleKey: string, corsHeaders: any) {
    console.log('💾 Guardando configuración de modelos Gemini:', { userId, configs: modelConfigs.length });
    
    // Validar que al menos un modelo esté habilitado
    const enabledCount = modelConfigs.filter(config => config.enabled).length;
    if (enabledCount === 0) {
        throw new Error('Debe haber al menos un modelo Gemini habilitado');
    }
    
    // Eliminar configuración anterior
    await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        }
    });
    
    // Insertar nueva configuración
    const configsToInsert = modelConfigs
        .filter(config => config.enabled) // Solo insertar modelos habilitados
        .map(config => ({
            user_id: userId,
            model_name: config.id,
            enabled: true
        }));
    
    if (configsToInsert.length > 0) {
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_ai_models_config`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(configsToInsert)
        });
        
        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Error guardando configuración: ${errorText}`);
        }
    }
    
    console.log('✅ Configuración de modelos Gemini guardada exitosamente');
    
    return new Response(JSON.stringify({
        data: {
            success: true,
            message: 'Configuración de modelos Gemini guardada exitosamente',
            enabled_models: configsToInsert.length,
            smart_flow_ready: configsToInsert.some(c => c.model_name === 'gemini-2.5-pro') && 
                             configsToInsert.some(c => c.model_name === 'gemini-2.5-flash-lite'),
            saved_at: new Date().toISOString()
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}