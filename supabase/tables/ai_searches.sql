CREATE TABLE ai_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    search_query TEXT NOT NULL,
    search_parameters JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);