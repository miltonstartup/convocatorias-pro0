-- Script para crear las tablas necesarias para ConvocatoriasPro
-- EJECUTAR ESTE SCRIPT EN LA CONSOLA SQL DE SUPABASE

-- 1. Tabla para convocatorias guardadas
CREATE TABLE IF NOT EXISTS saved_convocatorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ai_search_result_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    organization TEXT,
    deadline DATE,
    amount TEXT,
    requirements TEXT,
    source_url TEXT,
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabla para configuración de modelos IA
CREATE TABLE IF NOT EXISTS user_ai_models_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    model_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_user_id ON saved_convocatorias(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_created_at ON saved_convocatorias(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ai_models_config_user_id ON user_ai_models_config(user_id);

-- 4. Políticas RLS (Row Level Security)
ALTER TABLE saved_convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_models_config ENABLE ROW LEVEL SECURITY;

-- Políticas para saved_convocatorias
CREATE POLICY IF NOT EXISTS "Users can view own saved convocatorias" 
    ON saved_convocatorias FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own saved convocatorias" 
    ON saved_convocatorias FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own saved convocatorias" 
    ON saved_convocatorias FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own saved convocatorias" 
    ON saved_convocatorias FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para user_ai_models_config
CREATE POLICY IF NOT EXISTS "Users can view own ai models config" 
    ON user_ai_models_config FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own ai models config" 
    ON user_ai_models_config FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own ai models config" 
    ON user_ai_models_config FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own ai models config" 
    ON user_ai_models_config FOR DELETE 
    USING (auth.uid() = user_id);

-- 5. Triggers para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_saved_convocatorias_updated_at 
    BEFORE UPDATE ON saved_convocatorias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_ai_models_config_updated_at 
    BEFORE UPDATE ON user_ai_models_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificar que las tablas se crearon correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('saved_convocatorias', 'user_ai_models_config')
ORDER BY table_name, ordinal_position;