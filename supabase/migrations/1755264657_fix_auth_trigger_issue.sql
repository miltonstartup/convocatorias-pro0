-- Migration: fix_auth_trigger_issue
-- Created at: 1755264657

-- DESHABILITAR el trigger problemático que causa error HTTP 500
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- DESHABILITAR también la función problemática
DROP FUNCTION IF EXISTS sync_plan_from_metadata();

-- Crear función simple y segura SOLO si no existe un perfil
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  profile_data json;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN '{"error": "No authenticated user"}'::json;
  END IF;

  -- Solo crear si NO existe
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    INSERT INTO public.profiles (id, plan, created_at, updated_at)
    VALUES (user_id, 'free', NOW(), NOW());
  END IF;

  -- Retornar perfil
  SELECT row_to_json(profiles.*) INTO profile_data 
  FROM public.profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(profile_data, '{"error": "Profile not found"}'::json);
END;
$$;;