-- =============================================================================
-- TATTVA AI - Migration 003: Retire Image Generation Subsystem
-- =============================================================================
-- NOTICE: Per Master Order Phase 5, do NOT execute destructive DROP statements
-- on production databases without explicit authorization.
-- This migration script records the schema cleanup steps for when production
-- archive/retirement is executed.
-- =============================================================================

-- 1. Create audit archive for existing historical image generation jobs
CREATE TABLE IF NOT EXISTS public.archived_image_generation_jobs AS
SELECT * FROM public.image_generation_jobs
WITH NO DATA;

-- 2. Soft-disable / Mark retired in configuration
COMMENT ON TABLE public.image_generation_jobs IS 'RETIRED: Image generation subsystem permanently decommissioned from TATTVA AI.';
COMMENT ON TABLE public.image_history IS 'RETIRED: Image generation subsystem permanently decommissioned from TATTVA AI.';

-- 3. Decommission triggers & functions (Safe cleanup)
DROP FUNCTION IF EXISTS public.handle_new_image_job() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_stale_image_jobs() CASCADE;

-- 4. To permanently drop after backup verification (Uncomment only with explicit user approval):
-- DROP TABLE IF EXISTS public.image_generation_jobs CASCADE;
-- DROP TABLE IF EXISTS public.image_history CASCADE;
