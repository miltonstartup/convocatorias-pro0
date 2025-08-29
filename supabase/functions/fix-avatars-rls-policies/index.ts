// Edge Function: fix-avatars-rls-policies
// CORRECCIÓN CRÍTICA: Políticas RLS seguras para bucket de avatares
// Solo usuarios autenticados pueden subir/gestionar sus propios avatares

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
        console.log('🔧 [FIX-AVATARS-RLS] Corrigiendo políticas RLS para avatares...');
        
        // Obtener credenciales de Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Configuración de Supabase no disponible');
        }

        console.log('🗑️ Eliminando políticas públicas incorrectas...');
        
        // 1. ELIMINAR políticas públicas incorrectas
        const dropPolicies = [
            'DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects;',
            'DROP POLICY IF EXISTS "Public Upload for avatars" ON storage.objects;', 
            'DROP POLICY IF EXISTS "Public Update for avatars" ON storage.objects;',
            'DROP POLICY IF EXISTS "Public Delete for avatars" ON storage.objects;',
            'DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;',
            'DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;'
        ];

        for (const dropQuery of dropPolicies) {
            try {
                await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json',
                        'apikey': serviceRoleKey,
                    },
                    body: JSON.stringify({ query: dropQuery })
                });
                console.log('✅ Política eliminada:', dropQuery.split('"')[1]);
            } catch (error) {
                console.log('⚠️ Error eliminando política (puede no existir):', error.message);
            }
        }

        console.log('🔐 Creando nuevas políticas RLS seguras...');
        
        // 2. CREAR políticas RLS seguras para usuarios autenticados
        const secureRLSPolicies = [
            {
                name: 'authenticated_users_can_view_avatars',
                query: `CREATE POLICY "Authenticated users can view avatars" ON storage.objects 
                        FOR SELECT 
                        USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');`
            },
            {
                name: 'users_can_upload_own_avatar', 
                query: `CREATE POLICY "Users can upload own avatar" ON storage.objects 
                        FOR INSERT 
                        WITH CHECK (bucket_id = 'avatars' 
                                   AND auth.role() = 'authenticated' 
                                   AND (storage.foldername(name))[1] = auth.uid()::text);`
            },
            {
                name: 'users_can_update_own_avatar',
                query: `CREATE POLICY "Users can update own avatar" ON storage.objects 
                        FOR UPDATE 
                        USING (bucket_id = 'avatars' 
                              AND auth.role() = 'authenticated' 
                              AND (storage.foldername(name))[1] = auth.uid()::text);`
            },
            {
                name: 'users_can_delete_own_avatar',
                query: `CREATE POLICY "Users can delete own avatar" ON storage.objects 
                        FOR DELETE 
                        USING (bucket_id = 'avatars' 
                              AND auth.role() = 'authenticated' 
                              AND (storage.foldername(name))[1] = auth.uid()::text);`
            }
        ];

        const policyResults = [];
        
        for (const policy of secureRLSPolicies) {
            try {
                const policyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json',
                        'apikey': serviceRoleKey,
                    },
                    body: JSON.stringify({ query: policy.query })
                });

                if (policyResponse.ok) {
                    console.log('✅ Política RLS creada:', policy.name);
                    policyResults.push({ policy: policy.name, status: 'success' });
                } else {
                    const errorText = await policyResponse.text();
                    console.error('❌ Error creando política:', policy.name, errorText);
                    policyResults.push({ policy: policy.name, status: 'error', error: errorText });
                }
            } catch (error) {
                console.error('❌ Error ejecutando política:', policy.name, error.message);
                policyResults.push({ policy: policy.name, status: 'error', error: error.message });
            }
        }

        console.log('✅ Políticas RLS para avatares corregidas exitosamente');
        
        return new Response(JSON.stringify({
            data: {
                success: true,
                message: 'Políticas RLS para avatares corregidas - Solo usuarios autenticados',
                bucket: 'avatars',
                security_model: 'user_owned_files',
                policies_applied: policyResults,
                timestamp: new Date().toISOString()
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ ERROR CRÍTICO corrigiendo políticas RLS:', error);
        
        return new Response(JSON.stringify({
            error: {
                code: 'RLS_POLICY_FIX_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});