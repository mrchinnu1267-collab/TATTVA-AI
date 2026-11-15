-- =============================================================================
-- TATTVA AI - Self-Contained Supabase Storage & Workspace Migration
-- Target Bucket: 'tattva-images'
-- Enforces: Private Access (Public OFF), 25MB Limit, Allowed MIME Types,
-- Prerequisite Workspace & Membership Tables, and Object RLS Policies:
-- Object Path: {userId}/{workspaceId}/{imageId}.{png|jpeg|webp}
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Required Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- STEP 2: Prerequisite Workspace & Role-Based Membership Tables
-- (Creates tables if not yet initialized in the database)
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
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
CREATE POLICY "Users can view workspaces they belong to" ON public.workspaces
    FOR SELECT TO authenticated
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = workspaces.id
              AND wm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert personal workspaces" ON public.workspaces;
CREATE POLICY "Users can insert personal workspaces" ON public.workspaces
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

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
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view membership" ON public.workspace_members;
CREATE POLICY "Members can view membership" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_members.workspace_id
              AND w.owner_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- STEP 3: Configure 'tattva-images' Bucket
-- (Private: Public OFF, Max File Size: 25MB, Allowed MIMEs: PNG, JPEG, WEBP)
-- -----------------------------------------------------------------------------
UPDATE storage.buckets
SET 
    public = FALSE,
    file_size_limit = 26214400, -- 25MB (25 * 1024 * 1024 bytes)
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'tattva-images' OR name = 'tattva-images';

-- Insert bucket safely if not already registered in storage.buckets
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

-- -----------------------------------------------------------------------------
-- STEP 4: Clean Existing Storage Policies (Idempotency)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "TATTVA Images: Authenticated Users Upload to Own Directory" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users View Authorized Images Only" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users Update Authorized Images Only" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users Delete Authorized Images Only" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- -----------------------------------------------------------------------------
-- STEP 5: Storage Security Policy: Authenticated Uploads (INSERT)
-- Pattern: {userId}/{workspaceId}/{imageId}.{png|jpeg|webp}
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Authenticated Users Upload to Own Directory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tattva-images' AND
    (
        -- Personal user folder: first segment matches authenticated user ID
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Workspace member: second segment matches workspace where user is a member
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = (storage.foldername(name))[2]::uuid
                  AND wm.user_id = auth.uid()
            )
        )
        OR
        -- Workspace owner:
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspaces w
                WHERE w.id = (storage.foldername(name))[2]::uuid
                  AND w.owner_id = auth.uid()
            )
        )
    )
);

-- -----------------------------------------------------------------------------
-- STEP 6: Storage Security Policy: Authorized Downloads & Viewing (SELECT)
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Users View Authorized Images Only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (
        -- Personal user folder: owner can read
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Workspace member:
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = (storage.foldername(name))[2]::uuid
                  AND wm.user_id = auth.uid()
            )
        )
        OR
        -- Workspace owner:
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspaces w
                WHERE w.id = (storage.foldername(name))[2]::uuid
                  AND w.owner_id = auth.uid()
            )
        )
    )
);

-- -----------------------------------------------------------------------------
-- STEP 7: Storage Security Policy: Authorized Updates (UPDATE)
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Users Update Authorized Images Only"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = (storage.foldername(name))[2]::uuid
                  AND wm.user_id = auth.uid()
                  AND wm.role IN ('owner', 'admin')
            )
        )
        OR
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspaces w
                WHERE w.id = (storage.foldername(name))[2]::uuid
                  AND w.owner_id = auth.uid()
            )
        )
    )
)
WITH CHECK (
    bucket_id = 'tattva-images' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = (storage.foldername(name))[2]::uuid
                  AND wm.user_id = auth.uid()
                  AND wm.role IN ('owner', 'admin')
            )
        )
    )
);

-- -----------------------------------------------------------------------------
-- STEP 8: Storage Security Policy: Authorized Deletion (DELETE)
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Users Delete Authorized Images Only"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (
        -- Personal folder: owner of folder can delete
        (storage.foldername(name))[1] = auth.uid()::text
        OR
        -- Workspace admin or owner
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = (storage.foldername(name))[2]::uuid
                  AND wm.user_id = auth.uid()
                  AND wm.role IN ('owner', 'admin')
            )
        )
        OR
        (
            (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
            EXISTS (
                SELECT 1 FROM public.workspaces w
                WHERE w.id = (storage.foldername(name))[2]::uuid
                  AND w.owner_id = auth.uid()
            )
        )
    )
);

-- -----------------------------------------------------------------------------
-- STEP 9: Image History Metadata Table & RLS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.image_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL DEFAULT 'default',
    image_url TEXT NOT NULL,
    storage_path TEXT,
    storage_type TEXT NOT NULL DEFAULT 'supabase_storage' CHECK (storage_type IN ('supabase_storage', 'vault_fallback')),
    prompt TEXT NOT NULL,
    original_prompt TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    agent_id TEXT,
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    accuracy_scorecard JSONB,
    parent_image_id TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.image_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own image history" ON public.image_history;
CREATE POLICY "Users can insert their own image history" ON public.image_history
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()::text OR
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Users can view their own image history" ON public.image_history;
CREATE POLICY "Users can view their own image history" ON public.image_history
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()::text OR
        (workspace_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
         EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = image_history.workspace_id::uuid
              AND wm.user_id = auth.uid()
         ))
    );

DROP POLICY IF EXISTS "Users can delete their own image history" ON public.image_history;
CREATE POLICY "Users can delete their own image history" ON public.image_history
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()::text OR
        (workspace_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
         EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = image_history.workspace_id::uuid
              AND wm.role IN ('owner', 'admin')
         ))
    );
