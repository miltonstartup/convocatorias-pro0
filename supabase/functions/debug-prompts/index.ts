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
        console.log('🔧 DEBUG PROMPTS - Iniciando diagnóstico');
        
        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

        console.log('🔑 Configuración:', {
            hasServiceRoleKey: !!serviceRoleKey,
            hasAnonKey: !!anonKey,
            supabaseUrl: supabaseUrl
        });

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Obtener usuario desde auth header
        const authHeader = req.headers.get('authorization');
        console.log('📋 Auth Header presente:', !!authHeader);
        
        if (!authHeader) {
            throw new Error('Token de autorización requerido');
        }

        const token = authHeader.replace('Bearer ', '');
        console.log('🔐 Token extraído, longitud:', token.length);
        
        // Verificar usuario con API de auth
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey // Usar anon key en lugar de service role
            }
        });

        console.log('👤 User API Response Status:', userResponse.status);
        
        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.log('❌ User API Error:', errorText);
            throw new Error(`Token no válido: ${userResponse.status} - ${errorText}`);
        }

        const userData = await userResponse.json();
        console.log('✅ Usuario autenticado:', {
            id: userData.id,
            email: userData.email,
            aud: userData.aud
        });

        const userId = userData.id;

        // Probar inserción simple
        console.log('💾 Intentando inserción de prueba...');
        
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/user_custom_prompts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`, // Usar token del usuario
                'apikey': anonKey, // Usar anon key
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                user_id: userId,
                prompt_type: 'debug_test',
                custom_prompt: 'Prompt de prueba para debug',
                is_active: true
            })
        });

        console.log('📥 Insert Response Status:', insertResponse.status);
        
        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            console.log('❌ Insert Error:', errorText);
            
            return new Response(JSON.stringify({
                debug: {
                    success: false,
                    error: `Insert failed: ${insertResponse.status}`,
                    details: errorText,
                    userId: userId,
                    token_length: token.length
                }
            }), {
                status: 200, // Retornar 200 para poder ver el debug
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('✅ Inserción exitosa!');
        
        // Limpiar el registro de prueba
        await fetch(`${supabaseUrl}/rest/v1/user_custom_prompts?user_id=eq.${userId}&prompt_type=eq.debug_test`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey
            }
        });

        return new Response(JSON.stringify({
            debug: {
                success: true,
                message: 'Diagnóstico completado exitosamente',
                userId: userId,
                userEmail: userData.email
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ ERROR en diagnóstico:', error);
        
        return new Response(JSON.stringify({
            debug: {
                success: false,
                error: error.message,
                stack: error.stack
            }
        }), {
            status: 200, // Retornar 200 para poder ver el debug
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
