-- Migration: create_user_custom_prompts_table
-- Created at: 1755356635

-- Crear tabla para prompts personalizados por usuario
CREATE TABLE IF NOT EXISTS user_custom_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_type TEXT NOT NULL CHECK (prompt_type IN ('openrouter', 'gemini_flash', 'gemini_pro', 'smart_flow_step1', 'smart_flow_step2')),
    custom_prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicados por usuario-tipo
    UNIQUE(user_id, prompt_type)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_custom_prompts_user_id ON user_custom_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_prompts_type ON user_custom_prompts(prompt_type);
CREATE INDEX IF NOT EXISTS idx_user_custom_prompts_active ON user_custom_prompts(is_active);

-- Trigger para auto-actualizar updated_at
CREATE TRIGGER update_user_custom_prompts_updated_at 
    BEFORE UPDATE ON user_custom_prompts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Configurar Row Level Security (RLS)
ALTER TABLE user_custom_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own custom prompts" ON user_custom_prompts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom prompts" ON user_custom_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom prompts" ON user_custom_prompts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom prompts" ON user_custom_prompts
    FOR DELETE USING (auth.uid() = user_id);;