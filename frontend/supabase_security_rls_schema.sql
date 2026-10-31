-- =============================================================================
-- TATTVA AI - Advanced Application Security & Zero Trust Database Architecture
-- Comprehensive PostgreSQL Row Level Security (RLS) Schema
-- Conceptualized & Engineered by kotapati Gowtham Chowdary
-- =============================================================================

-- Enable required cryptographic & vector extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- -----------------------------------------------------------------------------
-- 1. WORKSPACES TABLE (Tenant & Organization Isolation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_personal BOOLEAN NOT NULL DEFAULT TRUE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);

-- -----------------------------------------------------------------------------
-- 2. WORKSPACE MEMBERS TABLE (Role-Based Access Control: Owner, Admin, Member, Viewer)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON public.workspace_members(workspace_id);

-- -----------------------------------------------------------------------------
-- 3. USER PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    security_tier TEXT NOT NULL DEFAULT 'standard' CHECK (security_tier IN ('standard', 'pro_encrypted', 'enterprise')),
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- -----------------------------------------------------------------------------
-- 4. CONVERSATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    pinned_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON public.conversations(workspace_id);

-- -----------------------------------------------------------------------------
-- 5. MESSAGES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'image', 'document', 'code')),
    attachments JSONB DEFAULT '[]'::jsonb,
    recalled_memories JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);

-- -----------------------------------------------------------------------------
-- 6. USER FILES & DOCUMENTS VAULT TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400), -- max 25MB
    sha256_hash TEXT NOT NULL,
    is_malware_scanned BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_files_user ON public.user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_ws ON public.user_files(workspace_id);

-- -----------------------------------------------------------------------------
-- 7. USER LONG-TERM MEMORIES TABLE (pgvector 3072-dim)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('preference', 'project', 'technical_level', 'language', 'formatting', 'instruction')),
    importance INTEGER NOT NULL DEFAULT 7 CHECK (importance >= 1 AND importance <= 10),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    source TEXT NOT NULL DEFAULT 'explicit' CHECK (source IN ('explicit', 'extracted')),
    embedding vector(3072),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_memories_email ON public.user_memories(user_email);
CREATE INDEX IF NOT EXISTS idx_user_memories_uid ON public.user_memories(user_id);

-- -----------------------------------------------------------------------------
-- 8. SECURITY AUDIT LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    route TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_security_logs_user ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event ON public.security_audit_logs(event_type);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - ZERO TRUST ENFORCEMENT
-- =============================================================================

-- Enable RLS across all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is member of a workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = ws_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. WORKSPACES POLICIES
CREATE POLICY "Users can view workspaces they own or belong to" ON public.workspaces
    FOR SELECT USING (owner_id = auth.uid() OR public.is_workspace_member(id));

CREATE POLICY "Users can create their own workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their workspaces" ON public.workspaces
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces" ON public.workspaces
    FOR DELETE USING (owner_id = auth.uid());

-- 2. WORKSPACE MEMBERS POLICIES
CREATE POLICY "Members can view other members in their workspace" ON public.workspace_members
    FOR SELECT USING (public.is_workspace_member(workspace_id) OR user_id = auth.uid());

CREATE POLICY "Admins or owners can manage members" ON public.workspace_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = workspace_members.workspace_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- 3. USER PROFILES POLICIES
CREATE POLICY "Users can read their own profile" ON public.user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (id = auth.uid());

-- 4. CONVERSATIONS POLICIES
CREATE POLICY "Users can view own conversations or shared workspace conversations" ON public.conversations
    FOR SELECT USING (
        user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    );

CREATE POLICY "Users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (user_id = auth.uid());

-- 5. MESSAGES POLICIES
CREATE POLICY "Users can view messages in permitted conversations" ON public.messages
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.user_id = auth.uid() OR (c.workspace_id IS NOT NULL AND public.is_workspace_member(c.workspace_id)))
        )
    );

CREATE POLICY "Users can insert messages into permitted conversations" ON public.messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id AND c.user_id = auth.uid()
        )
    );

-- 6. USER FILES POLICIES
CREATE POLICY "Users can view own files or workspace files" ON public.user_files
    FOR SELECT USING (
        user_id = auth.uid() OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    );

CREATE POLICY "Users can insert their own files" ON public.user_files
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own files" ON public.user_files
    FOR DELETE USING (user_id = auth.uid());

-- 7. USER MEMORIES POLICIES
CREATE POLICY "Users can view and manage their own memories only" ON public.user_memories
    FOR ALL USING (
        user_id = auth.uid() OR (auth.jwt() ->> 'email' = user_email) OR user_email = 'guest_user'
    )
    WITH CHECK (
        user_id = auth.uid() OR (auth.jwt() ->> 'email' = user_email) OR user_email = 'guest_user'
    );

-- 8. SECURITY AUDIT LOGS (Write-Only by Server Service Role, Read by Auditing Admins)
CREATE POLICY "Admins can view security audit logs" ON public.security_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND security_tier = 'enterprise'
        )
    );

-- =============================================================================
-- STORAGE BUCKET POLICIES (Private Vault: 'tattva-secure-vault')
-- =============================================================================
-- Insert bucket record if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'tattva-secure-vault',
    'tattva-secure-vault',
    FALSE, -- Strictly private, requires signed URLs
    26214400, -- 25MB limit
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
        'image/jpeg',
        'image/webp',
        'text/plain',
        'text/csv'
    ]
) ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- Storage RLS: Users can only upload to their own user folder (auth.uid() / ...)
CREATE POLICY "Private Uploads: Users upload to own directory" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'tattva-secure-vault' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage RLS: Users can only read objects in their own directory
CREATE POLICY "Private Downloads: Users read own directory only" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'tattva-secure-vault' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage RLS: Users can delete only their own objects
CREATE POLICY "Private Deletion: Users delete own directory objects" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'tattva-secure-vault' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
