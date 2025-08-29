-- Esquema completo de la base de datos ConvocatoriasPro
-- Ejecutar estos comandos en el editor SQL de Supabase

-- 1. Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' NOT NULL CHECK (plan IN ('free', 'pro_monthly', 'pro_annual')),
  plan_expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla de convocatorias
CREATE TABLE IF NOT EXISTS convocatorias (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  nombre_concurso TEXT NOT NULL,
  institucion TEXT,
  fecha_apertura TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ NOT NULL,
  fecha_resultados TIMESTAMPTZ,
  estado TEXT DEFAULT 'abierto' NOT NULL CHECK (estado IN ('abierto', 'cerrado', 'en_evaluacion', 'finalizado')),
  tipo_fondo TEXT,
  area TEXT,
  requisitos JSONB,
  fuente TEXT,
  monto_financiamiento TEXT,
  notas_usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla de planes
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_clp INTEGER NOT NULL,
  mp_checkout_url TEXT NOT NULL,
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Crear tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  plan_id TEXT,
  mp_payment_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'CLP',
  payment_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Crear tabla de rastreo automático
CREATE TABLE IF NOT EXISTS rastreo_automatico (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  institucion TEXT NOT NULL,
  url_fuente TEXT NOT NULL,
  keywords TEXT[],
  ultimo_rastreo TIMESTAMPTZ,
  convocatorias_encontradas INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_convocatorias_user_id ON convocatorias(user_id);
CREATE INDEX IF NOT EXISTS idx_convocatorias_estado ON convocatorias(estado);
CREATE INDEX IF NOT EXISTS idx_convocatorias_fecha_cierre ON convocatorias(fecha_cierre);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rastreo_user_id ON rastreo_automatico(user_id);

-- 7. Habilitar Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rastreo_automatico ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 9. Crear políticas RLS para convocatorias
CREATE POLICY "Users can view own convocatorias" ON convocatorias
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own convocatorias" ON convocatorias
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own convocatorias" ON convocatorias
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own convocatorias" ON convocatorias
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Crear políticas RLS para payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. Crear políticas RLS para rastreo_automatico
CREATE POLICY "Users can view own rastreo" ON rastreo_automatico
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own rastreo" ON rastreo_automatico
  FOR ALL USING (auth.uid() = user_id);

-- 12. Crear función para sincronizar perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NOW() + INTERVAL '3 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Crear trigger para crear perfil automáticamente
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 14. Insertar planes por defecto
INSERT INTO plans (id, name, price_clp, mp_checkout_url, description, features) VALUES
('pro_monthly', 'Pro Mensual', 8990, 'https://mpago.la/2ZyK8vL', 'Plan Pro con facturación mensual', 
  '["Convocatorias ilimitadas", "IA parsing", "Rastreo automático", "Exportación de datos", "Soporte prioritario"]'::jsonb),
('pro_annual', 'Pro Anual', 84990, 'https://mpago.la/1A2b3c4', 'Plan Pro con facturación anual (2 meses gratis)', 
  '["Convocatorias ilimitadas", "IA parsing", "Rastreo automático", "Exportación de datos", "Acceso anticipado", "1 colaborador", "Descuento de 2 meses"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_clp = EXCLUDED.price_clp,
  mp_checkout_url = EXCLUDED.mp_checkout_url,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- 15. Habilitar realtime para convocatorias (opcional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE convocatorias;

-- Fin del script de inicialización