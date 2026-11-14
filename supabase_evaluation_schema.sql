-- =============================================================================
-- TATTVA AI - MMMLU AI Benchmark Evaluation Engine Database Architecture
-- PostgreSQL Schema with Row Level Security (RLS)
-- Conceptualized & Engineered by kotapati Gowtham Chowdary
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. EVALUATION RUNS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluation_runs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dataset_name TEXT NOT NULL,
    dataset_version TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'hi-IN',
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    total_questions INTEGER NOT NULL DEFAULT 0,
    attempted_questions INTEGER NOT NULL DEFAULT 0,
    valid_attempts INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    incorrect_answers INTEGER NOT NULL DEFAULT 0,
    invalid_responses INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    accuracy NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    raw_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    average_response_time_ms INTEGER NOT NULL DEFAULT 0,
    total_duration_ms INTEGER NOT NULL DEFAULT 0,
    subject_accuracy JSONB NOT NULL DEFAULT '{}'::jsonb,
    selected_question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    seed INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 2. EVALUATION RESULTS TABLE (Question-by-Question Diagnostics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL REFERENCES public.evaluation_runs(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    expected_answer TEXT NOT NULL CHECK (expected_answer IN ('A', 'B', 'C', 'D')),
    ai_answer TEXT NOT NULL,
    explanation TEXT,
    raw_response TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL CHECK (status IN ('correct', 'incorrect', 'invalid_response', 'api_error', 'pending')),
    response_time_ms INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES FOR HIGH-THROUGHPUT FILTERING
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_user ON public.evaluation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_model ON public.evaluation_runs(provider, model);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_created ON public.evaluation_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_run ON public.evaluation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_subject ON public.evaluation_results(subject);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_status ON public.evaluation_results(status);

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;

-- Evaluation Runs Policies
CREATE POLICY "evaluation_runs_select_policy"
    ON public.evaluation_runs FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "evaluation_runs_insert_policy"
    ON public.evaluation_runs FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "evaluation_runs_update_policy"
    ON public.evaluation_runs FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "evaluation_runs_delete_policy"
    ON public.evaluation_runs FOR DELETE
    USING (auth.uid() = user_id);

-- Evaluation Results Policies
CREATE POLICY "evaluation_results_select_policy"
    ON public.evaluation_results FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.evaluation_runs r
            WHERE r.id = evaluation_results.run_id
            AND (r.user_id = auth.uid() OR r.user_id IS NULL)
        )
    );

CREATE POLICY "evaluation_results_insert_policy"
    ON public.evaluation_results FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.evaluation_runs r
            WHERE r.id = evaluation_results.run_id
            AND (r.user_id = auth.uid() OR r.user_id IS NULL)
        )
    );
