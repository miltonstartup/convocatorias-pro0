CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    search_name TEXT NOT NULL,
    original_query TEXT NOT NULL,
    search_parameters JSONB,
    last_run TIMESTAMP,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);