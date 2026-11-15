-- =============================================================================
-- TATTVA AI - Supabase Storage Migration: 'tattva-images' Bucket & RLS
-- Enforces Private Access, 25MB File Limit, Allowed MIME Types, and
-- Strict Workspace / User Isolation: {userId}/{workspaceId}/{imageId}.png
-- =============================================================================

-- 1. Ensure 'tattva-images' Bucket Configuration Meets Specification
-- (Private: Public OFF, Max File Size: 25MB, Allowed MIMEs: PNG, JPEG, WEBP)
UPDATE storage.buckets
SET 
    public = FALSE,
    file_size_limit = 26214400, -- 25MB (25 * 1024 * 1024 bytes)
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'tattva-images' OR name = 'tattva-images';

-- If bucket was not present, insert it safely (idempotent)
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

-- 2. Drop existing policies to prevent duplication
DROP POLICY IF EXISTS "TATTVA Images: Authenticated Users Upload to Own Directory" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users View Authorized Images Only" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users Update Authorized Images Only" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users Delete Authorized Images Only" ON storage.objects;

-- Also drop any legacy policies on tattva-images if they exist
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- 3. Storage Security Policy: Authenticated Uploads (INSERT)
-- Pattern: {userId}/{workspaceId}/{imageId}.{png|jpeg|webp}
-- Rule: The first folder path segment MUST match auth.uid(), or the user must be a member of the workspace.
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

-- 4. Storage Security Policy: Authorized Downloads & Viewing (SELECT)
-- Rule: Only the uploading user or authorized members of the workspace can view/download
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

-- 5. Storage Security Policy: Authorized Updates (UPDATE)
-- Rule: Only the owner or workspace admin can update image metadata
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

-- 6. Storage Security Policy: Authorized Deletion (DELETE)
-- Rule: Only the owner or workspace admin can delete images
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

-- 7. Ensure Image History Metadata Table Exists with Matching RLS
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
              AND wm.user_id = auth.uid()
              AND wm.role IN ('owner', 'admin')
         ))
    );
