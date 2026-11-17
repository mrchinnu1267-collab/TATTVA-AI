-- =============================================================================
-- TATTVA AI - PRODUCTION DATABASE MIGRATION 002 (FINAL REVIEWED)
-- Target Table: public.workspace_items
-- Security Model: Zero Trust (No Direct Anonymous Access)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Table with Exact Application Schema
-- Supports text IDs (e.g. "doc_word_annual_report" and generated string IDs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_items (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL DEFAULT 'default',
    user_id TEXT NOT NULL,
    app TEXT NOT NULL CHECK (app IN ('word', 'excel', 'powerpoint', 'outlook', 'onenote', 'publisher', 'access')),
    name TEXT NOT NULL,
    description TEXT,
    format TEXT NOT NULL DEFAULT 'json',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_id TEXT,
    storage_path TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    is_starred BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
    trashed_at TIMESTAMPTZ,
    tags TEXT[] NOT NULL DEFAULT '{}',
    version INT NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 2. Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_workspace_items_user ON public.workspace_items(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_workspace ON public.workspace_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_app ON public.workspace_items(app);
CREATE INDEX IF NOT EXISTS idx_workspace_items_trashed ON public.workspace_items(is_trashed);
CREATE INDEX IF NOT EXISTS idx_workspace_items_starred ON public.workspace_items(is_starred);
CREATE INDEX IF NOT EXISTS idx_workspace_items_updated ON public.workspace_items(updated_at DESC);

-- -----------------------------------------------------------------------------
-- 3. SQL Table Privileges (Defense-in-Depth)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE public.workspace_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workspace_items TO authenticated;
GRANT ALL ON TABLE public.workspace_items TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (RLS) Configuration
-- -----------------------------------------------------------------------------
ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;

-- Explicitly drop migration-owned policy names (preserves any unrelated policies)
DROP POLICY IF EXISTS "workspace_items_service_role_all" ON public.workspace_items;
DROP POLICY IF EXISTS "workspace_items_authenticated_select" ON public.workspace_items;
DROP POLICY IF EXISTS "workspace_items_authenticated_insert" ON public.workspace_items;
DROP POLICY IF EXISTS "workspace_items_authenticated_update" ON public.workspace_items;
DROP POLICY IF EXISTS "workspace_items_authenticated_delete" ON public.workspace_items;
DROP POLICY IF EXISTS "Service Role Full Access on workspace_items" ON public.workspace_items;
DROP POLICY IF EXISTS "Users can manage own workspace items" ON public.workspace_items;
DROP POLICY IF EXISTS "Anonymous Workspace Sandbox" ON public.workspace_items;

-- Policy A: Service Role Full Access (Trusted server-side execution only)
CREATE POLICY "workspace_items_service_role_all"
ON public.workspace_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy B: Authenticated User SELECT (Only own workspace items)
CREATE POLICY "workspace_items_authenticated_select"
ON public.workspace_items
FOR SELECT
TO authenticated
USING (user_id = auth.uid()::text);

-- Policy C: Authenticated User INSERT (Must set own user_id)
CREATE POLICY "workspace_items_authenticated_insert"
ON public.workspace_items
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid()::text);

-- Policy D: Authenticated User UPDATE (Can only modify own workspace items)
CREATE POLICY "workspace_items_authenticated_update"
ON public.workspace_items
FOR UPDATE
TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy E: Authenticated User DELETE (Can only delete own workspace items)
CREATE POLICY "workspace_items_authenticated_delete"
ON public.workspace_items
FOR DELETE
TO authenticated
USING (user_id = auth.uid()::text);
