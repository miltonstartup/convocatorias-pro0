-- Migración para corregir tablas de IA y configurar RLS apropiadamente
-- Created: 2025-08-17 06:00:01

-- Agregar usuario_id faltante a ai_search_results si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_search_results' AND column_name = 'user_id') THEN
        ALTER TABLE ai_search_results ADD COLUMN user_id UUID REFERENCES auth.users(id);
        CREATE INDEX IF NOT EXISTS idx_ai_search_results_user_id ON ai_search_results(user_id);
    END IF;
END $$;

-- Habilitar RLS en tablas de IA
ALTER TABLE ai_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_search_results ENABLE ROW LEVEL SECURITY;

-- Política permisiva para ai_searches (permitir operaciones de sistema)
DROP POLICY IF EXISTS "Allow system operations on ai_searches" ON ai_searches;
CREATE POLICY "Allow system operations on ai_searches" ON ai_searches
    FOR ALL USING (true); -- Política permisiva para operaciones de sistema

-- Política permisiva para ai_search_results (permitir operaciones de sistema)
DROP POLICY IF EXISTS "Allow system operations on ai_search_results" ON ai_search_results;
CREATE POLICY "Allow system operations on ai_search_results" ON ai_search_results
    FOR ALL USING (true); -- Política permisiva para operaciones de sistema

-- Crear tabla para guardar convocatorias favoritas si no existe
CREATE TABLE IF NOT EXISTS saved_convocatorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ai_search_result_id UUID REFERENCES ai_search_results(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    organization TEXT,
    deadline DATE,
    amount TEXT,
    requirements TEXT,
    source_url TEXT,
    tags TEXT[],
    notes TEXT, -- Notas personales del usuario
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para saved_convocatorias
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_user_id ON saved_convocatorias(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_deadline ON saved_convocatorias(deadline);

-- RLS para saved_convocatorias
ALTER TABLE saved_convocatorias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para saved_convocatorias
CREATE POLICY "Users can view own saved convocatorias" ON saved_convocatorias
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved convocatorias" ON saved_convocatorias
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved convocatorias" ON saved_convocatorias
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved convocatorias" ON saved_convocatorias
    FOR DELETE USING (auth.uid() = user_id);

-- Crear tabla para configuración de API keys globales
CREATE TABLE IF NOT EXISTS api_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL,
    endpoint_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Solo admin puede acceder a API configurations
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;

-- Función auxiliar para trigger de updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para auto-actualizar updated_at en saved_convocatorias
CREATE TRIGGER update_saved_convocatorias_updated_at 
    BEFORE UPDATE ON saved_convocatorias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Agregar columnas faltantes a convocatorias si no existen
DO $$ 
BEGIN
    -- tags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'convocatorias' AND column_name = 'tags') THEN
        ALTER TABLE convocatorias ADD COLUMN tags TEXT[];
    END IF;
    
    -- confidence_score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'convocatorias' AND column_name = 'confidence_score') THEN
        ALTER TABLE convocatorias ADD COLUMN confidence_score DECIMAL(3,2);
    END IF;
    
    -- ai_processed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'convocatorias' AND column_name = 'ai_processed') THEN
        ALTER TABLE convocatorias ADD COLUMN ai_processed BOOLEAN DEFAULT false;
    END IF;
    
    -- descripcion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'convocatorias' AND column_name = 'descripcion') THEN
        ALTER TABLE convocatorias ADD COLUMN descripcion TEXT;
    END IF;
    
    -- sitio_web
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'convocatorias' AND column_name = 'sitio_web') THEN
        ALTER TABLE convocatorias ADD COLUMN sitio_web TEXT;
    END IF;
END $$;

-- Insertar configuraciones por defecto de API (solo si no existen)
INSERT INTO api_configurations (service_name, api_key, endpoint_url, is_active) VALUES
('google_gemini', 'PLACEHOLDER_GOOGLE_API_KEY', 'https://generativelanguage.googleapis.com/v1beta/models/', true),
('openrouter', 'PLACEHOLDER_OPENROUTER_API_KEY', 'https://openrouter.ai/api/v1/chat/completions', true)
ON CONFLICT (service_name) DO NOTHING;

-- Comentario de migración
COMMENT ON TABLE saved_convocatorias IS 'Tabla para convocatorias guardadas por usuarios';
COMMENT ON TABLE api_configurations IS 'Configuración global de API keys para servicios de IA';