-- Migration: create_profile_rpc_function
-- Created at: 1755264151

-- Deshabilitar el trigger automático que puede estar causando conflictos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear una función RPC segura para crear perfiles
CREATE OR REPLACE FUNCTION public.create_profile(
  full_name_param TEXT DEFAULT NULL
) 
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos de Supabase
AS $$
DECLARE
  user_id UUID;
  user_email TEXT;
  profile_data json;
BEGIN
  -- Obtener el ID del usuario autenticado
  user_id := auth.uid();
  
  -- Verificar que el usuario esté autenticado
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener el email del usuario desde auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  -- Verificar si ya existe un perfil
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    -- Retornar el perfil existente
    SELECT row_to_json(profiles.*) INTO profile_data 
    FROM public.profiles 
    WHERE id = user_id;
    
    RETURN profile_data;
  END IF;

  -- Crear nuevo perfil
  INSERT INTO public.profiles (
    id,
    full_name,
    plan,
    trial_ends_at,
    convocatorias_count,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    COALESCE(full_name_param, user_email),
    'free',
    NOW() + INTERVAL '3 days',
    0,
    NOW(),
    NOW()
  );

  -- Retornar el perfil creado
  SELECT row_to_json(profiles.*) INTO profile_data 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN profile_data;
END;
$$;;