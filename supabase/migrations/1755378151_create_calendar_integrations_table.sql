-- Tabla para integraciones de calendario
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    google_calendar_enabled BOOLEAN DEFAULT false,
    google_access_token TEXT,
    google_refresh_token TEXT,
    default_calendar_id TEXT DEFAULT 'primary',
    reminder_minutes INTEGER DEFAULT 60,
    sync_deadline_events BOOLEAN DEFAULT true,
    sync_application_events BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_enabled ON calendar_integrations(google_calendar_enabled) WHERE google_calendar_enabled = true;

-- Políticas RLS para calendar_integrations
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar integrations" ON calendar_integrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar integrations" ON calendar_integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar integrations" ON calendar_integrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar integrations" ON calendar_integrations
    FOR DELETE USING (auth.uid() = user_id);
