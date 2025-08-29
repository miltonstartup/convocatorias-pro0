-- Migration: add_user_id_to_ai_search_results
-- Created at: 1755351913

ALTER TABLE ai_search_results ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;;