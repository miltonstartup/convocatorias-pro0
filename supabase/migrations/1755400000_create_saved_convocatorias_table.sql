-- Crear tabla para convocatorias guardadas por los usuarios
CREATE TABLE IF NOT EXISTS saved_convocatorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    organization TEXT,
    amount TEXT,
    deadline DATE,
    requirements TEXT,
    source_url TEXT,
    category TEXT DEFAULT 'General',
    tags TEXT[] DEFAULT '{}',
    from_ai_search BOOLEAN DEFAULT false,
    ai_search_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_user_id ON saved_convocatorias(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_created_at ON saved_convocatorias(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_deadline ON saved_convocatorias(deadline);
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_category ON saved_convocatorias(category);
CREATE INDEX IF NOT EXISTS idx_saved_convocatorias_title ON saved_convocatorias USING gin(to_tsvector('spanish', title));

-- Habilitar RLS (Row Level Security)
ALTER TABLE saved_convocatorias ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden ver/gestionar sus propias convocatorias guardadas
CREATE POLICY "Users can view own saved convocatorias" 
    ON saved_convocatorias 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved convocatorias" 
    ON saved_convocatorias 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved convocatorias" 
    ON saved_convocatorias 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved convocatorias" 
    ON saved_convocatorias 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_saved_convocatorias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_convocatorias_updated_at
    BEFORE UPDATE ON saved_convocatorias
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_convocatorias_updated_at();