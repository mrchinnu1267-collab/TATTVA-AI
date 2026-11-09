-- =============================================================================
-- TATTVA AI - MY WORKSPACE SCHEMA
-- Relational Database & Storage Schema for 7 Productivity Applications:
-- Word, Excel, PowerPoint, Outlook, OneNote, Publisher, Access
-- Conceptualized & Engineered for TATTVA AI Suite
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. UNIFIED WORKSPACE ITEMS (Documents, Spreadsheets, Presentations, Designs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app TEXT NOT NULL CHECK (app IN ('word', 'excel', 'powerpoint', 'outlook', 'onenote', 'publisher', 'access')),
    name TEXT NOT NULL,
    description TEXT,
    format TEXT NOT NULL DEFAULT 'json',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_id UUID REFERENCES public.user_files(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_workspace_items_user ON public.workspace_items(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_app ON public.workspace_items(app);
CREATE INDEX IF NOT EXISTS idx_workspace_items_trashed ON public.workspace_items(is_trashed);
CREATE INDEX IF NOT EXISTS idx_workspace_items_starred ON public.workspace_items(is_starred);
CREATE INDEX IF NOT EXISTS idx_workspace_items_updated ON public.workspace_items(updated_at DESC);

-- -----------------------------------------------------------------------------
-- 2. WORKSPACE ITEM VERSIONS (Document History & Undo/Restore)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_item_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.workspace_items(id) ON DELETE CASCADE,
    version INT NOT NULL,
    name TEXT NOT NULL,
    content JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(item_id, version)
);

CREATE INDEX IF NOT EXISTS idx_workspace_versions_item ON public.workspace_item_versions(item_id);

-- -----------------------------------------------------------------------------
-- 3. OUTLOOK: CALENDAR EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
    recurring TEXT CHECK (recurring IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    reminder_minutes INT DEFAULT 15,
    attendees TEXT[] DEFAULT '{}',
    color TEXT DEFAULT '#0284c7',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_workspace_events_user ON public.workspace_events(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_events_start ON public.workspace_events(start_time);

-- -----------------------------------------------------------------------------
-- 4. OUTLOOK: CONTACTS DIRECTORY
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    organization TEXT,
    job_title TEXT,
    notes TEXT,
    contact_group TEXT DEFAULT 'General',
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_workspace_contacts_user ON public.workspace_contacts(user_id);

-- -----------------------------------------------------------------------------
-- 5. ONENOTE: NOTEBOOKS, SECTIONS, & PAGES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8B5CF6',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.workspace_notebook_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.workspace_notebooks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#A78BFA',
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.workspace_notebook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.workspace_notebook_sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Page',
    content JSONB NOT NULL DEFAULT '{"blocks": []}'::jsonb,
    drawings JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notebook_pages_section ON public.workspace_notebook_pages(section_id);

-- -----------------------------------------------------------------------------
-- 6. ACCESS: DATABASE MANAGEMENT (Databases, Tables, Columns, Rows)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_db_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    tables_meta JSONB NOT NULL DEFAULT '[]'::jsonb,
    relationships JSONB NOT NULL DEFAULT '[]'::jsonb,
    saved_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.workspace_db_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.workspace_db_projects(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    schema JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of { field, type, isPrimary, isNullable, references }
    records JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of row objects
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(project_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_db_tables_project ON public.workspace_db_tables(project_id);

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users can only read, write, edit, and delete their own items.
-- -----------------------------------------------------------------------------
ALTER TABLE public.workspace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notebook_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_notebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_db_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_db_tables ENABLE ROW LEVEL SECURITY;

-- Workspace Items Policy
DROP POLICY IF EXISTS "Users can manage own workspace items" ON public.workspace_items;
CREATE POLICY "Users can manage own workspace items" ON public.workspace_items
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Events Policy
DROP POLICY IF EXISTS "Users can manage own events" ON public.workspace_events;
CREATE POLICY "Users can manage own events" ON public.workspace_events
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Contacts Policy
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.workspace_contacts;
CREATE POLICY "Users can manage own contacts" ON public.workspace_contacts
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Notebooks Policy
DROP POLICY IF EXISTS "Users can manage own notebooks" ON public.workspace_notebooks;
CREATE POLICY "Users can manage own notebooks" ON public.workspace_notebooks
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Database Projects Policy
DROP POLICY IF EXISTS "Users can manage own db projects" ON public.workspace_db_projects;
CREATE POLICY "Users can manage own db projects" ON public.workspace_db_projects
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

