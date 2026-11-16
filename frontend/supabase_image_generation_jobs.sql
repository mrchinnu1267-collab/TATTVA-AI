-- =============================================================================
-- TATTVA AI - Durable Image Job Persistence Migration (Supabase PostgreSQL)
-- Target Table: public.image_generation_jobs
-- Target Storage Bucket: 'tattva-images' (Private)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create image_generation_jobs Table with all 23 Required Columns
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.image_generation_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    workspace_id TEXT DEFAULT 'default',
    prompt TEXT NOT NULL,
    prompt_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    current_stage TEXT NOT NULL DEFAULT 'queued',
    progress_percent INTEGER NOT NULL DEFAULT 5,
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
-- 2. Indexes for High-Concurrency Lookups and Stale Worker Detection
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_img_jobs_status ON public.image_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_img_jobs_user_id ON public.image_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_img_jobs_heartbeat ON public.image_generation_jobs(worker_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_img_jobs_created_at ON public.image_generation_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_img_jobs_prompt_hash ON public.image_generation_jobs(prompt_hash);

-- -----------------------------------------------------------------------------
-- 3. Atomic Job Claiming Stored Procedure
-- Matches exact serverless concurrency & recovery requirements:
-- Only claims if status is 'queued' OR if worker heartbeat > 45s stale.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_image_job(p_job_id TEXT)
RETURNS SETOF public.image_generation_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.image_generation_jobs
    SET status = 'processing',
        current_stage = 'generating',
        worker_heartbeat_at = now(),
        started_at = COALESCE(started_at, now()),
        updated_at = now()
    WHERE id = p_job_id
      AND (
          status = 'queued' 
          OR (status = 'processing' AND worker_heartbeat_at < now() - interval '45 seconds')
      )
    RETURNING *;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.image_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and Authenticated Select on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Public and Authenticated Insert on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Public and Authenticated Update on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Public and Authenticated Delete on image_generation_jobs" ON public.image_generation_jobs;

CREATE POLICY "Public and Authenticated Select on image_generation_jobs"
ON public.image_generation_jobs
FOR SELECT
USING (true);

CREATE POLICY "Public and Authenticated Insert on image_generation_jobs"
ON public.image_generation_jobs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public and Authenticated Update on image_generation_jobs"
ON public.image_generation_jobs
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public and Authenticated Delete on image_generation_jobs"
ON public.image_generation_jobs
FOR DELETE
USING (
    auth.uid()::text = user_id 
    OR user_id IS NULL 
    OR user_id = 'anonymous'
    OR user_id LIKE 'guest_%'
);

-- -----------------------------------------------------------------------------
-- 5. Supabase Storage: 'tattva-images' Private Bucket Configuration
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tattva-images',
    'tattva-images',
    FALSE,
    26214400,
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = FALSE,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- Storage Policies for 'tattva-images'
DROP POLICY IF EXISTS "TATTVA Images Storage: Read Access" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Update Access" ON storage.objects;

CREATE POLICY "TATTVA Images Storage: Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'tattva-images');

CREATE POLICY "TATTVA Images Storage: Insert Access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tattva-images');

CREATE POLICY "TATTVA Images Storage: Update Access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tattva-images')
WITH CHECK (bucket_id = 'tattva-images');
