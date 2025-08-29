-- Migration: create_user_ai_models_config_table
-- Created at: 1755343664

-- Crear tabla para configuración de modelos IA por usuario
CREATE TABLE IF NOT EXISTS user_ai_models_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_name VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicados por usuario-modelo
    UNIQUE(user_id, model_name)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_ai_models_config_user_id ON user_ai_models_config(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_models_config_enabled ON user_ai_models_config(enabled);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para auto-actualizar updated_at
CREATE TRIGGER update_user_ai_models_config_updated_at 
    BEFORE UPDATE ON user_ai_models_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Configurar Row Level Security (RLS)
ALTER TABLE user_ai_models_config ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean sus propias configuraciones
CREATE POLICY "Users can view own AI model configs" ON user_ai_models_config
    FOR SELECT USING (auth.uid() = user_id);

-- Política para insertar configuraciones
CREATE POLICY "Users can insert own AI model configs" ON user_ai_models_config
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para actualizar configuraciones
CREATE POLICY "Users can update own AI model configs" ON user_ai_models_config
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para eliminar configuraciones
CREATE POLICY "Users can delete own AI model configs" ON user_ai_models_config
    FOR DELETE USING (auth.uid() = user_id);;