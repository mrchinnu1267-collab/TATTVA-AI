-- =============================================================================
-- TATTVA AI - Durable Image Job Persistence & Security Hardening Migration
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

-- Helper function: Check if current user is member of a workspace (if not already existing)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. Atomic Job Claiming Stored Procedure (Security Hardened)
-- Matches exact serverless concurrency & recovery requirements:
-- Only claims if status is 'queued' OR if worker heartbeat > 45s stale.
-- Validates caller authorization to prevent rogue claiming.
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
    -- Verify authorization: allow service_role or authenticated owner / workspace member
    IF v_role IS NOT NULL AND v_role != 'service_role' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.image_generation_jobs
            WHERE id = p_job_id
              AND (
                  user_id = v_uid
                  OR (
                      workspace_id IS NOT NULL 
                      AND workspace_id != 'default' 
                      AND workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                      AND public.is_workspace_member(workspace_id::uuid)
                  )
              )
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Caller cannot claim job %', p_job_id;
        END IF;
    END IF;

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

-- Restrict RPC Execution: Revoke from public/anon, grant to service_role & authenticated
REVOKE EXECUTE ON FUNCTION public.claim_image_job(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_image_job(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_image_job(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_image_job(TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS) with Zero Trust Ownership Checks
-- Anonymous users cannot retrieve other users' prompts, jobs, or images.
-- -----------------------------------------------------------------------------
ALTER TABLE public.image_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Clean up any obsolete/permissive policies
DROP POLICY IF EXISTS "Public and Authenticated Select on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Public and Authenticated Insert on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Public and Authenticated Update on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Public and Authenticated Delete on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner and Workspace Member Select on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner and Workspace Member Insert on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner and Workspace Member Update on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Owner Delete on image_generation_jobs" ON public.image_generation_jobs;
DROP POLICY IF EXISTS "Service Role Full Access on image_generation_jobs" ON public.image_generation_jobs;

-- Service Role Full Administrative Access
CREATE POLICY "Service Role Full Access on image_generation_jobs"
ON public.image_generation_jobs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated Owner & Workspace Member Policies
CREATE POLICY "Owner and Workspace Member Select on image_generation_jobs"
ON public.image_generation_jobs
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()::text
    OR (
        workspace_id IS NOT NULL 
        AND workspace_id != 'default' 
        AND workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.is_workspace_member(workspace_id::uuid)
    )
);

CREATE POLICY "Owner and Workspace Member Insert on image_generation_jobs"
ON public.image_generation_jobs
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()::text
    OR (
        workspace_id IS NOT NULL 
        AND workspace_id != 'default' 
        AND workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.is_workspace_member(workspace_id::uuid)
    )
);

CREATE POLICY "Owner and Workspace Member Update on image_generation_jobs"
ON public.image_generation_jobs
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()::text
    OR (
        workspace_id IS NOT NULL 
        AND workspace_id != 'default' 
        AND workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.is_workspace_member(workspace_id::uuid)
    )
)
WITH CHECK (
    user_id = auth.uid()::text
    OR (
        workspace_id IS NOT NULL 
        AND workspace_id != 'default' 
        AND workspace_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.is_workspace_member(workspace_id::uuid)
    )
);

CREATE POLICY "Owner Delete on image_generation_jobs"
ON public.image_generation_jobs
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- 5. Supabase Storage: 'tattva-images' Private Bucket Configuration & Ownership RLS
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

-- Storage Policies for 'tattva-images' (Strict Owner Isolation: {userId}/{workspaceId}/...)
DROP POLICY IF EXISTS "TATTVA Images Storage: Read Access" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Insert Access" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Update Access" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Owner Read" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Owner Insert" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images Storage: Owner Delete" ON storage.objects;

CREATE POLICY "TATTVA Images Storage: Owner Read"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR auth.role() = 'service_role'
    )
);

CREATE POLICY "TATTVA Images Storage: Owner Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tattva-images' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR auth.role() = 'service_role'
    )
);

CREATE POLICY "TATTVA Images Storage: Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR auth.role() = 'service_role'
    )
)
WITH CHECK (
    bucket_id = 'tattva-images' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR auth.role() = 'service_role'
    )
);

CREATE POLICY "TATTVA Images Storage: Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR auth.role() = 'service_role'
    )
);
