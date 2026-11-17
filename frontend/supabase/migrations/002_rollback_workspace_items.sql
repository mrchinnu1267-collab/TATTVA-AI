-- =============================================================================
-- SAFE ROLLBACK SCRIPT FOR MIGRATION 002: workspace_items
-- Execution Model: Non-destructive to unrelated objects (RESTRICT mode)
-- =============================================================================

-- 1. Drop Specific Performance Indexes
DROP INDEX IF EXISTS public.idx_workspace_items_user;
DROP INDEX IF EXISTS public.idx_workspace_items_workspace;
DROP INDEX IF EXISTS public.idx_workspace_items_app;
DROP INDEX IF EXISTS public.idx_workspace_items_trashed;
DROP INDEX IF EXISTS public.idx_workspace_items_starred;
DROP INDEX IF EXISTS public.idx_workspace_items_updated;

-- 2. Drop Target Table
-- Note: RESTRICT prevents accidental drop of dependent tables/views if any exist
DROP TABLE IF EXISTS public.workspace_items RESTRICT;
