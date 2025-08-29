-- Migración base: Esquema completo de la base de datos
-- Aplicar en Supabase Dashboard -> SQL Editor

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar Row Level Security por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Tabla de perfiles de usuario sincronizada con auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' NOT NULL, -- 'free', 'pro_monthly', 'pro_annual'
  plan_expires_at TIMESTAMPTZ,
  convocatorias_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuarios pueden insertar su propio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Tabla de planes de suscripción
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, -- 'free', 'pro_monthly', 'pro_annual'
  name TEXT NOT NULL,
  price_clp INTEGER NOT NULL DEFAULT 0,
  max_convocatorias INTEGER DEFAULT -1, -- -1 = ilimitado
  mp_checkout_url TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar planes predefinidos
INSERT INTO plans (id, name, price_clp, max_convocatorias, features) VALUES
('free', 'Plan Gratuito', 0, 5, '["Ingreso manual", "Vista básica", "5 convocatorias máx."]'::jsonb),
('pro_monthly', 'Pro Mensual', 8990, -1, '["Agentes IA", "Rastreo automático", "Exportación", "Sin límites"]'::jsonb),
('pro_annual', 'Pro Anual', 84990, -1, '["Todo Pro Mensual", "2 meses gratis", "Colaboradores", "Acceso anticipado"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_clp = EXCLUDED.price_clp,
  max_convocatorias = EXCLUDED.max_convocatorias,
  features = EXCLUDED.features;

-- Tabla de convocatorias
CREATE TABLE IF NOT EXISTS convocatorias (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nombre_concurso TEXT NOT NULL,
  institucion TEXT,
  fecha_apertura TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ NOT NULL,
  fecha_resultados TIMESTAMPTZ,
  estado TEXT DEFAULT 'abierto' NOT NULL, -- 'abierto', 'cerrado', 'en_evaluacion', 'finalizado'
  monto_financiamiento TEXT,
  requisitos TEXT,
  descripcion TEXT,
  contacto TEXT,
  sitio_web TEXT,
  fuente TEXT,
  tags TEXT[] DEFAULT '{}',
  confidence_score REAL DEFAULT 0,
  ai_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en convocatorias
ALTER TABLE convocatorias ENABLE ROW LEVEL SECURITY;

-- Políticas para convocatorias con control de límites por plan
CREATE POLICY "Usuarios pueden ver sus propias convocatorias"
  ON convocatorias FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar convocatorias respetando límites"
  ON convocatorias FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Plan Pro: sin límites
      (SELECT plan FROM profiles WHERE id = auth.uid()) IN ('pro_monthly', 'pro_annual') OR
      -- Plan Free: máximo 5 convocatorias
      (SELECT plan FROM profiles WHERE id = auth.uid()) = 'free' AND
      (SELECT COUNT(*) FROM convocatorias WHERE user_id = auth.uid()) < 5
    )
  );

CREATE POLICY "Usuarios pueden actualizar sus propias convocatorias"
  ON convocatorias FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propias convocatorias"
  ON convocatorias FOR DELETE
  USING (auth.uid() = user_id);

-- Tabla de pagos para auditoría
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES plans(id),
  mp_payment_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'approved', 'failed', 'pending', 'cancelled'
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'CLP',
  payment_method TEXT,
  external_reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Políticas para payments
CREATE POLICY "Usuarios pueden ver sus propios pagos"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el sistema puede insertar/actualizar pagos
CREATE POLICY "Solo service_role puede insertar pagos"
  ON payments FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Solo service_role puede actualizar pagos"
  ON payments FOR UPDATE
  TO service_role
  USING (true);