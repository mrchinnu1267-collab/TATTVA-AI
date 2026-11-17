-- =============================================================================
-- SAFE ROLLBACK SCRIPT FOR MIGRATION 001: image_generation_jobs
-- Execution Model: Non-destructive to unrelated objects (RESTRICT mode)
-- =============================================================================

-- 1. Drop Stored Procedure
DROP FUNCTION IF EXISTS public.claim_image_job(TEXT);

-- 2. Drop Specific Performance Indexes
DROP INDEX IF EXISTS public.idx_img_jobs_status;
DROP INDEX IF EXISTS public.idx_img_jobs_user_id;
DROP INDEX IF EXISTS public.idx_img_jobs_workspace_id;
DROP INDEX IF EXISTS public.idx_img_jobs_heartbeat;
DROP INDEX IF EXISTS public.idx_img_jobs_created_at;
DROP INDEX IF EXISTS public.idx_img_jobs_prompt_hash;

-- 3. Drop Target Table
-- Note: RESTRICT prevents accidental drop of dependent tables/views if any exist
DROP TABLE IF EXISTS public.image_generation_jobs RESTRICT;
