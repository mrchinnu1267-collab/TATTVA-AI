-- =============================================================================
-- TATTVA AI: Self-Personalizing Memory & Feedback Engine Schema
-- Supabase PostgreSQL + pgvector Schema
-- Conceptualized & Engineered by kotapati Gowtham Chowdary
-- =============================================================================

-- 1. Enable pgvector extension for high-performance vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. User Long-Term Memories Table
CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('preference', 'project', 'technical_level', 'language', 'formatting', 'instruction')),
    importance INTEGER NOT NULL DEFAULT 7 CHECK (importance >= 1 AND importance <= 10),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    source TEXT NOT NULL DEFAULT 'explicit' CHECK (source IN ('explicit', 'extracted')),
    embedding vector(3072), -- 3072-dimensional vector embedding from gemini-embedding-001
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing for user email and fast recall
CREATE INDEX IF NOT EXISTS idx_user_memories_email ON public.user_memories(user_email);
CREATE INDEX IF NOT EXISTS idx_user_memories_active ON public.user_memories(user_email, active);

-- Optional HNSW index for high-speed cosine vector similarity search
-- (Uncomment if pgvector indexing is desired)
-- CREATE INDEX IF NOT EXISTS idx_user_memories_embedding ON public.user_memories USING hnsw (embedding vector_cosine_ops);

-- 3. User Personalization Settings & Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_email TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    technical_depth TEXT NOT NULL DEFAULT 'advanced' CHECK (technical_depth IN ('beginner', 'intermediate', 'advanced', 'expert')),
    response_length TEXT NOT NULL DEFAULT 'balanced' CHECK (response_length IN ('concise', 'balanced', 'detailed', 'deep_dive')),
    tone TEXT NOT NULL DEFAULT 'conversational' CHECK (tone IN ('conversational', 'direct', 'technical', 'empathic')),
    preferred_language TEXT NOT NULL DEFAULT 'auto',
    code_style TEXT NOT NULL DEFAULT 'clean_typed' CHECK (code_style IN ('clean_typed', 'detailed_comments', 'minimalist')),
    situational_emojis BOOLEAN NOT NULL DEFAULT TRUE,
    custom_instructions TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. User Message Feedback Table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id TEXT NOT NULL,
    session_id TEXT,
    user_email TEXT NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
    category TEXT NOT NULL CHECK (category IN ('helpful', 'not_helpful', 'too_detailed', 'too_short', 'incorrect_answer', 'wrong_language', 'other')),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_email ON public.user_feedback(user_email);

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own memories only
CREATE POLICY "Users can manage own memories" ON public.user_memories
    FOR ALL
    USING (auth.jwt() ->> 'email' = user_email OR user_email = 'guest_user')
    WITH CHECK (auth.jwt() ->> 'email' = user_email OR user_email = 'guest_user');

-- Allow authenticated users to manage own preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL
    USING (auth.jwt() ->> 'email' = user_email OR user_email = 'guest_user')
    WITH CHECK (auth.jwt() ->> 'email' = user_email OR user_email = 'guest_user');

-- Allow authenticated users to record and view own feedback
CREATE POLICY "Users can manage own feedback" ON public.user_feedback
    FOR ALL
    USING (auth.jwt() ->> 'email' = user_email OR user_email = 'guest_user')
    WITH CHECK (auth.jwt() ->> 'email' = user_email OR user_email = 'guest_user');

-- 6. Pinned Conversation Columns on conversations table
ALTER TABLE IF EXISTS public.conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.conversations ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_conversations_pinned ON public.conversations(is_pinned, pinned_at DESC);
