-- Funciones y triggers para automatización
-- Aplicar después de 001_base_schema.sql

-- Función para sincronizar plan desde user_metadata
CREATE OR REPLACE FUNCTION sync_plan_from_metadata()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, plan, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'plan', 'free'), NOW())
  ON CONFLICT (id) DO UPDATE SET
    plan = COALESCE(NEW.raw_user_meta_data->>'plan', 'free'),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar cuando se actualiza auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_plan_from_metadata();

-- Función para contar convocatorias del usuario
CREATE OR REPLACE FUNCTION update_convocatorias_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles
    SET convocatorias_count = convocatorias_count + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles
    SET convocatorias_count = convocatorias_count - 1
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar contador de convocatorias
DROP TRIGGER IF EXISTS on_convocatoria_change ON convocatorias;
CREATE TRIGGER on_convocatoria_change
  AFTER INSERT OR DELETE ON convocatorias
  FOR EACH ROW
  EXECUTE FUNCTION update_convocatorias_count();

-- Función para validar límites de plan
CREATE OR REPLACE FUNCTION check_plan_limits()
RETURNS trigger AS $$
DECLARE
  user_plan TEXT;
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Obtener plan del usuario
  SELECT plan INTO user_plan
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Obtener límite del plan
  SELECT max_convocatorias INTO max_allowed
  FROM plans
  WHERE id = user_plan;
  
  -- Si es ilimitado (-1), permitir
  IF max_allowed = -1 THEN
    RETURN NEW;
  END IF;
  
  -- Contar convocatorias actuales
  SELECT COUNT(*) INTO current_count
  FROM convocatorias
  WHERE user_id = NEW.user_id;
  
  -- Verificar límite
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Límite de convocatorias alcanzado para el plan %', user_plan;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar límites antes de insertar
DROP TRIGGER IF EXISTS before_convocatoria_insert ON convocatorias;
CREATE TRIGGER before_convocatoria_insert
  BEFORE INSERT ON convocatorias
  FOR EACH ROW
  EXECUTE FUNCTION check_plan_limits();

-- Función para obtener estadísticas del usuario
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE(
  total_convocatorias INTEGER,
  convocatorias_abiertas INTEGER,
  convocatorias_cerradas INTEGER,
  plan_actual TEXT,
  limite_plan INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_convocatorias,
    COUNT(CASE WHEN c.estado = 'abierto' THEN 1 END)::INTEGER as convocatorias_abiertas,
    COUNT(CASE WHEN c.estado IN ('cerrado', 'finalizado') THEN 1 END)::INTEGER as convocatorias_cerradas,
    p.plan as plan_actual,
    pl.max_convocatorias as limite_plan
  FROM profiles p
  LEFT JOIN convocatorias c ON c.user_id = p.id
  LEFT JOIN plans pl ON pl.id = p.plan
  WHERE p.id = user_uuid
  GROUP BY p.plan, pl.max_convocatorias;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para buscar convocatorias con filtros
CREATE OR REPLACE FUNCTION search_convocatorias(
  user_uuid UUID,
  search_term TEXT DEFAULT NULL,
  estado_filter TEXT DEFAULT NULL,
  institucion_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  id BIGINT,
  nombre_concurso TEXT,
  institucion TEXT,
  fecha_cierre TIMESTAMPTZ,
  estado TEXT,
  monto_financiamiento TEXT,
  confidence_score REAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nombre_concurso,
    c.institucion,
    c.fecha_cierre,
    c.estado,
    c.monto_financiamiento,
    c.confidence_score,
    c.created_at
  FROM convocatorias c
  WHERE c.user_id = user_uuid
    AND (search_term IS NULL OR (
      c.nombre_concurso ILIKE '%' || search_term || '%' OR
      c.institucion ILIKE '%' || search_term || '%' OR
      c.descripcion ILIKE '%' || search_term || '%'
    ))
    AND (estado_filter IS NULL OR c.estado = estado_filter)
    AND (institucion_filter IS NULL OR c.institucion = institucion_filter)
  ORDER BY c.fecha_cierre ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;