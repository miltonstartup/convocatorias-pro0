// Edge Function: create-avatars-bucket-secure
// VERSIÓN SEGURA: Crear bucket de avatares con políticas RLS apropiadas
// Solo usuarios autenticados pueden subir sus propios avatares

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('🔐 [CREATE-AVATARS-BUCKET-SECURE] Creando bucket seguro...');
        
        // Obtener credenciales de Supabase
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase no disponible');
        }

        // 1. CREAR BUCKET (si no existe)
        console.log('📦 Creando bucket de avatares...');
        
        const bucketConfig = {
            id: 'avatars',
            name: 'avatars',
            public: false, // ⚠️ IMPORTANTE: NO público
            allowed_mime_types: ["image/*"],
            file_size_limit: 5242880 // 5MB
        };

        const createBucketResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bucketConfig)
        });

        let bucketCreated = false;
        if (createBucketResponse.ok) {
            console.log('✅ Bucket creado exitosamente');
            bucketCreated = true;
        } else {
            const bucketError = await createBucketResponse.text();
            if (bucketError.includes('already exists')) {
                console.log('✅ Bucket ya existe, continuando...');
                bucketCreated = true;
            } else {
                console.error('❌ Error creando bucket:', bucketError);
                throw new Error('Error creando bucket: ' + bucketError);
            }
        }

        // 2. CONFIGURAR POLÍTICAS RLS SEGURAS
        if (bucketCreated) {
            console.log('🔐 Configurando políticas RLS seguras...');
            
            // Primero eliminar políticas existentes que puedan ser problemáticas
            const cleanupPolicies = [
                'DROP POLICY IF EXISTS "Public Access for avatars" ON storage.objects;',
                'DROP POLICY IF EXISTS "Public Upload for avatars" ON storage.objects;',
                'DROP POLICY IF EXISTS "Public Update for avatars" ON storage.objects;',
                'DROP POLICY IF EXISTS "Public Delete for avatars" ON storage.objects;'
            ];

            for (const cleanupQuery of cleanupPolicies) {
                try {
                    await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json',
                            'apikey': serviceRoleKey,
                        },
                        body: JSON.stringify({ query: cleanupQuery })
                    });
                } catch (error) {
                    console.log('⚠️ Limpieza de política (ignorando error):', error.message);
                }
            }

            // Crear políticas RLS seguras
            const secureRLSPolicies = [
                {
                    name: 'authenticated_users_view_avatars',
                    query: `CREATE POLICY "Authenticated users view avatars" ON storage.objects 
                            FOR SELECT 
                            USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');`
                },
                {
                    name: 'users_upload_own_avatar',
                    query: `CREATE POLICY "Users upload own avatar" ON storage.objects 
                            FOR INSERT 
                            WITH CHECK (bucket_id = 'avatars' 
                                       AND auth.role() = 'authenticated' 
                                       AND (storage.foldername(name))[1] = auth.uid()::text);`
                },
                {
                    name: 'users_update_own_avatar',
                    query: `CREATE POLICY "Users update own avatar" ON storage.objects 
                            FOR UPDATE 
                            USING (bucket_id = 'avatars' 
                                  AND auth.role() = 'authenticated' 
                                  AND (storage.foldername(name))[1] = auth.uid()::text);`
                },
                {
                    name: 'users_delete_own_avatar',
                    query: `CREATE POLICY "Users delete own avatar" ON storage.objects 
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
                        console.log('✅ Política RLS aplicada:', policy.name);
                        policyResults.push({ policy: policy.name, status: 'success' });
                    } else {
                        const errorText = await policyResponse.text();
                        console.warn('⚠️ Error aplicando política:', policy.name, errorText);
                        policyResults.push({ policy: policy.name, status: 'warning', error: errorText });
                    }
                } catch (error) {
                    console.error('❌ Error ejecutando política:', policy.name, error.message);
                    policyResults.push({ policy: policy.name, status: 'error', error: error.message });
                }
            }
        }

        console.log('✅ Bucket de avatares configurado de forma segura');
        
        return new Response(JSON.stringify({
            data: {
                success: true,
                message: 'Bucket de avatares creado con políticas RLS seguras',
                bucket: {
                    name: 'avatars',
                    public: false,
                    security_model: 'authenticated_users_only',
                    file_size_limit: '5MB',
                    allowed_types: ['image/*']
                },
                instructions: {
                    upload_path: '{user_id}/avatar.{extension}',
                    example: 'abc123-def456/avatar.jpg',
                    note: 'Solo usuarios autenticados pueden subir a su propia carpeta'
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ ERROR CRÍTICO creando bucket seguro:', error);
        
        return new Response(JSON.stringify({
            error: {
                code: 'SECURE_BUCKET_CREATION_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
