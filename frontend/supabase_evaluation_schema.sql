-- =============================================================================
-- TATTVA AI - Complete AI Evaluation & Intelligence Development Schema
-- Comprehensive PostgreSQL Schema with Row Level Security (RLS)
-- Conceptualized & Engineered by kotapati Gowtham Chowdary
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. DATASETS REGISTRY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.datasets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL,
    license TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    language TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    format TEXT NOT NULL CHECK (format IN ('csv', 'json', 'jsonl')),
    relative_path TEXT NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    intended_purpose TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    has_verified_answers BOOLEAN NOT NULL DEFAULT TRUE,
    schema_type TEXT NOT NULL DEFAULT 'indic_mcq',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 2. EVALUATION RUNS TABLE
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
-- 3. EVALUATION RESULTS TABLE (Question-by-Question Diagnostics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id TEXT NOT NULL REFERENCES public.evaluation_runs(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    expected_answer TEXT NOT NULL,
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
-- 4. MODEL COMPARISONS TABLE (Arena & Side-by-side Benchmarks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.model_comparisons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dataset_name TEXT NOT NULL,
    sample_size INTEGER NOT NULL,
    seed INTEGER NOT NULL,
    fair_benchmark_condition_met BOOLEAN NOT NULL DEFAULT TRUE,
    models_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
    winner_model JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 5. IMPROVEMENT RECOMMENDATIONS & HUMAN APPROVAL WORKFLOW
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.improvement_recommendations (
    id TEXT PRIMARY KEY,
    run_id TEXT REFERENCES public.evaluation_runs(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    actionable_step TEXT NOT NULL,
    suggested_patch_area TEXT NOT NULL,
    supporting_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    human_approval_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (human_approval_status IN ('pending_review', 'approved', 'rejected', 'implemented')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    implemented_at TIMESTAMPTZ,
    regression_baseline_score NUMERIC(5,2),
    post_implementation_score NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 6. CONVERSATIONAL & MULTILINGUAL EVALUATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversational_evaluations (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    language TEXT NOT NULL,
    total_cases INTEGER NOT NULL DEFAULT 0,
    passed_cases INTEGER NOT NULL DEFAULT 0,
    partial_cases INTEGER NOT NULL DEFAULT 0,
    failed_cases INTEGER NOT NULL DEFAULT 0,
    overall_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    category_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_user ON public.evaluation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_model ON public.evaluation_runs(provider, model);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_run ON public.evaluation_results(run_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_results_status ON public.evaluation_results(status);
CREATE INDEX IF NOT EXISTS idx_model_comparisons_user ON public.model_comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_improvements_status ON public.improvement_recommendations(human_approval_status);

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversational_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "datasets_read_policy" ON public.datasets FOR SELECT USING (true);
CREATE POLICY "evaluation_runs_select_policy" ON public.evaluation_runs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "evaluation_runs_insert_policy" ON public.evaluation_runs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "evaluation_results_select_policy" ON public.evaluation_results FOR SELECT USING (EXISTS (SELECT 1 FROM public.evaluation_runs r WHERE r.id = evaluation_results.run_id AND (r.user_id = auth.uid() OR r.user_id IS NULL)));
CREATE POLICY "model_comparisons_select_policy" ON public.model_comparisons FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "improvements_select_policy" ON public.improvement_recommendations FOR SELECT USING (true);
CREATE POLICY "conversational_eval_select_policy" ON public.conversational_evaluations FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
