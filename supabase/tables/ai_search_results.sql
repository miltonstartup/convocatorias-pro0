CREATE TABLE ai_search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID REFERENCES ai_searches(id),
    title TEXT NOT NULL,
    description TEXT,
    deadline DATE,
    amount TEXT,
    requirements TEXT,
    source_url TEXT,
    validated_data JSONB,
    approved_by_user BOOLEAN DEFAULT FALSE,
    added_to_calendar BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);