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
        // Extraer parámetros de la solicitud
        const requestData = await req.json();
        const { search_name, original_query, search_parameters = {}, is_favorite = false } = requestData;

        if (!search_name || search_name.trim().length === 0) {
            throw new Error('El nombre de la búsqueda es requerido');
        }

        if (!original_query || original_query.trim().length === 0) {
            throw new Error('La consulta original es requerida');
        }

        // Obtener credenciales
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Configuración de Supabase faltante');
        }

        // Verificar autenticación del usuario
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Header de autorización requerido');
        }

        const token = authHeader.replace('Bearer ', '');

        // Verificar token y obtener usuario
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Token inválido');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Verificar si ya existe una búsqueda guardada con el mismo nombre
        const existingSearchResponse = await fetch(`${supabaseUrl}/rest/v1/saved_searches?user_id=eq.${userId}&search_name=eq.${encodeURIComponent(search_name.trim())}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (existingSearchResponse.ok) {
            const existingSearches = await existingSearchResponse.json();
            if (existingSearches.length > 0) {
                throw new Error('Ya existe una búsqueda guardada con ese nombre');
            }
        }

        // Crear búsqueda guardada
        const savedSearchId = crypto.randomUUID();
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/saved_searches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                id: savedSearchId,
                user_id: userId,
                search_name: search_name.trim(),
                original_query: original_query.trim(),
                search_parameters,
                is_favorite,
                last_run: null
            })
        });

        if (!insertResponse.ok) {
            const errorText = await insertResponse.text();
            throw new Error(`Error al guardar búsqueda: ${errorText}`);
        }

        const savedSearchData = await insertResponse.json();

        return new Response(JSON.stringify({
            data: {
                saved_search: savedSearchData[0],
                message: 'Búsqueda guardada exitosamente'
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error al guardar búsqueda:', error);

        const errorResponse = {
            error: {
                code: 'SAVE_SEARCH_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
