-- Migration: Create Email Alerts System
-- Created at: 1755367890
-- Implementa sistema completo de alertas por email

-- 1. Tabla de configuración de alertas por usuario
CREATE TABLE IF NOT EXISTS user_alert_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  deadline_alerts_enabled BOOLEAN DEFAULT true,
  new_opportunities_enabled BOOLEAN DEFAULT false,
  weekly_digest_enabled BOOLEAN DEFAULT true,
  deadline_alert_days INTEGER DEFAULT 7, -- Días antes del vencimiento
  preferred_time TIME DEFAULT '09:00:00', -- Hora preferida para envíos
  timezone TEXT DEFAULT 'America/Santiago',
  email_frequency TEXT DEFAULT 'daily' CHECK (email_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  last_email_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Tabla de alertas programadas
CREATE TABLE IF NOT EXISTS scheduled_alerts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  convocatoria_id BIGINT REFERENCES convocatorias(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('deadline_warning', 'deadline_urgent', 'new_opportunity', 'weekly_digest', 'results_available')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  email_content JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de logs de emails enviados
CREATE TABLE IF NOT EXISTS email_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  alert_id BIGINT REFERENCES scheduled_alerts(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed')),
  provider_id TEXT, -- ID del proveedor de email (Resend, SendGrid, etc.)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Habilitar RLS en las nuevas tablas
ALTER TABLE user_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para user_alert_settings
CREATE POLICY "Users can view own alert settings" ON user_alert_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alert settings" ON user_alert_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert settings" ON user_alert_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Políticas RLS para scheduled_alerts
CREATE POLICY "Users can view own scheduled alerts" ON scheduled_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- Solo las Edge Functions pueden insertar/actualizar alertas
CREATE POLICY "Service role can manage scheduled alerts" ON scheduled_alerts
  FOR ALL TO service_role USING (true);

-- 7. Políticas RLS para email_logs
CREATE POLICY "Users can view own email logs" ON email_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email logs" ON email_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- 8. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_user_alert_settings_user_id ON user_alert_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_alerts_user_id ON scheduled_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_alerts_scheduled_for ON scheduled_alerts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_alerts_status ON scheduled_alerts(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- 9. Función para crear configuración de alertas por defecto
CREATE OR REPLACE FUNCTION create_default_alert_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_alert_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger para crear configuración de alertas automáticamente
CREATE OR REPLACE TRIGGER on_profile_created_alert_settings
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_default_alert_settings();

-- 11. Función para programar alertas automáticamente
CREATE OR REPLACE FUNCTION schedule_deadline_alerts()
RETURNS trigger AS $$
DECLARE
  alert_settings RECORD;
  alert_date TIMESTAMPTZ;
BEGIN
  -- Obtener configuración de alertas del usuario
  SELECT * INTO alert_settings
  FROM user_alert_settings
  WHERE user_id = NEW.user_id AND deadline_alerts_enabled = true;

  -- Si no hay configuración o las alertas están deshabilitadas, salir
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calcular fecha de alerta (días antes del vencimiento)
  alert_date := NEW.fecha_cierre - INTERVAL '1 day' * alert_settings.deadline_alert_days;

  -- Solo programar si la fecha de alerta es futura
  IF alert_date > NOW() THEN
    -- Insertar alerta de advertencia (7 días antes por defecto)
    INSERT INTO scheduled_alerts (
      user_id, 
      convocatoria_id, 
      alert_type, 
      scheduled_for,
      email_content
    )
    VALUES (
      NEW.user_id,
      NEW.id,
      'deadline_warning',
      alert_date,
      jsonb_build_object(
        'convocatoria_name', NEW.nombre_concurso,
        'institucion', NEW.institucion,
        'fecha_cierre', NEW.fecha_cierre,
        'days_until', alert_settings.deadline_alert_days
      )
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Alerta urgente (1 día antes)
  alert_date := NEW.fecha_cierre - INTERVAL '1 day';
  IF alert_date > NOW() THEN
    INSERT INTO scheduled_alerts (
      user_id,
      convocatoria_id,
      alert_type,
      scheduled_for,
      email_content
    )
    VALUES (
      NEW.user_id,
      NEW.id,
      'deadline_urgent',
      alert_date,
      jsonb_build_object(
        'convocatoria_name', NEW.nombre_concurso,
        'institucion', NEW.institucion,
        'fecha_cierre', NEW.fecha_cierre,
        'days_until', 1
      )
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger para programar alertas cuando se crea/actualiza una convocatoria
CREATE OR REPLACE TRIGGER on_convocatoria_deadline_alerts
  AFTER INSERT OR UPDATE OF fecha_cierre ON convocatorias
  FOR EACH ROW EXECUTE FUNCTION schedule_deadline_alerts();

-- 13. Función para obtener alertas pendientes
CREATE OR REPLACE FUNCTION get_pending_alerts()
RETURNS TABLE (
  alert_id BIGINT,
  user_id UUID,
  user_email TEXT,
  alert_type TEXT,
  scheduled_for TIMESTAMPTZ,
  email_content JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.user_id,
    au.email,
    sa.alert_type,
    sa.scheduled_for,
    sa.email_content
  FROM scheduled_alerts sa
  JOIN auth.users au ON au.id = sa.user_id
  WHERE sa.status = 'pending' 
    AND sa.scheduled_for <= NOW()
  ORDER BY sa.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fin de la migración del sistema de alertas por email