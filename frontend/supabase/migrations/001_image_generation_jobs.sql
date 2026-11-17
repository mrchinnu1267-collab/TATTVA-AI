-- =============================================================================
-- TATTVA AI - PRODUCTION DATABASE MIGRATION 001 (FINAL REVIEWED)
-- Target Table: public.image_generation_jobs
-- Security Model: Zero Trust (No Direct Anonymous Access)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Table with Exact 23-Column Application Schema
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.image_generation_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL DEFAULT 'default',
    prompt TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
    current_stage TEXT NOT NULL DEFAULT 'queued',
    progress_percent INTEGER NOT NULL DEFAULT 5 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 4,
    accuracy NUMERIC,
    verification_status TEXT,
    verification_result JSONB,
    result_storage_path TEXT,
    result_image_url TEXT,
    error_message TEXT,
    timestamps JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    worker_heartbeat_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 2. Performance & Recovery Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_img_jobs_status ON public.image_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_img_jobs_user_id ON public.image_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_img_jobs_workspace_id ON public.image_generation_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_img_jobs_heartbeat ON public.image_generation_jobs(worker_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_img_jobs_created_at ON public.image_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_img_jobs_prompt_hash ON public.image_generation_jobs(prompt_hash);

-- -----------------------------------------------------------------------------
-- 3. Atomic Job Claiming Function (Strict Caller Validation & Ownership)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_image_job(p_job_id TEXT)
RETURNS SETOF public.image_generation_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT := auth.role();
    v_uid TEXT := auth.uid()::text;
BEGIN
    -- 1. Reject unauthenticated/anonymous direct RPC callers
    IF v_role IS NULL OR v_role = 'anon' THEN
        RAISE EXCEPTION 'Unauthorized: Anonymous callers cannot invoke job claim RPC';
    END IF;

    -- 2. Reject missing or malformed job ID
    IF p_job_id IS NULL OR trim(p_job_id) = '' THEN
        RAISE EXCEPTION 'InvalidParameter: p_job_id must not be empty';
    END IF;

    -- 3. Execute atomic claim with strict ownership in the UPDATE WHERE clause
    RETURN QUERY
    UPDATE public.image_generation_jobs
    SET status = 'processing',
        current_stage = 'generating',
        worker_heartbeat_at = now(),
        started_at = COALESCE(started_at, now()),
        updated_at = now()
    WHERE id = p_job_id
      -- Authorization Check: Only service_role or the authenticated owner can claim
      AND (
          v_role = 'service_role'
          OR (v_role = 'authenticated' AND user_id = v_uid)
      )
      -- Concurrency Check: Job must be queued, or stale worker heartbeat (>45s)
      AND (
          status = 'queued'
          OR (status = 'processing' AND worker_heartbeat_at < now() - interval '45 seconds')
      )
    RETURNING *;
END;
$$;

-- Restrict execution: Revoke from PUBLIC and anon; grant only to service_role and authenticated
REVOKE ALL ON FUNCTION public.claim_image_job(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_image_job(TEXT) TO service_role, authenticated;

-- -----------------------------------------------------------------------------
-- 4. SQL Table Privileges (Defense-in-Depth)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.image_generation_jobs FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.image_generation_jobs TO authenticated;
GRANT ALL ON TABLE public.image_generation_jobs TO service_role;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Configuration
-- -----------------------------------------------------------------------------
ALTER TABLE public.image_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Explicitly drop migration-owned policy names (preserves any unrelated policies)
DROP POLICY IF EXISTS "img_jobs_service_role_all" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "img_jobs_authenticated_select" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "img_jobs_authenticated_insert" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "img_jobs_authenticated_update" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "img_jobs_authenticated_delete" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Service Role Full Access on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Authenticated Owner Access on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Anonymous Job Access on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner and Workspace Member Select on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner and Workspace Member Insert on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner and Workspace Member Update on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner Delete on image_generation_jobs" ON public.image_generation_jobs;

-- Policy A: Service Role Full Access (Trusted server-side workers only)
CREATE POLICY "img_jobs_service_role_all"
ON public.image_generation_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy B: Authenticated User SELECT (Only own jobs)
CREATE POLICY "img_jobs_authenticated_select"
ON public.image_generation_jobs
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- Policy C: Authenticated User INSERT (Must set own user_id)
CREATE POLICY "img_jobs_authenticated_insert"
ON public.image_generation_jobs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- Policy D: Authenticated User UPDATE (Can only modify own jobs)
CREATE POLICY "img_jobs_authenticated_update"
ON public.image_generation_jobs
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy E: Authenticated User DELETE (Can only delete own jobs)
CREATE POLICY "img_jobs_authenticated_delete"
ON public.image_generation_jobs
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);
