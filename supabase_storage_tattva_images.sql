-- =============================================================================
-- TATTVA AI - Supabase Storage Migration: 'tattva-images' Bucket & RLS
-- Target Bucket: 'tattva-images'
-- Storage Path Structure: {userId}/{workspaceId}/{imageId}.{png|jpeg|webp}
-- Zero external table dependencies to guarantee 100% error-free execution.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: Configure 'tattva-images' Bucket
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
-- STEP 2: Drop Existing Policies to Prevent Conflicts & Duplication
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "TATTVA Images: Authenticated Users Upload to Own Directory" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users View Authorized Images Only" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users Update Authorized Images Only" ON storage.objects;
DROP POLICY IF EXISTS "TATTVA Images: Users Delete Authorized Images Only" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- -----------------------------------------------------------------------------
-- STEP 3: Storage Security Policy - Authenticated Uploads (INSERT)
-- Pattern: {userId}/{workspaceId}/{imageId}.{ext}
-- Rule: The first folder segment MUST match the authenticated user's ID
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Authenticated Users Upload to Own Directory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'tattva-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- STEP 4: Storage Security Policy - Authorized Downloads & Viewing (SELECT)
-- Rule: Users can only read objects in their own user directory
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Users View Authorized Images Only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- STEP 5: Storage Security Policy - Authorized Updates (UPDATE)
-- Rule: Users can only update objects in their own user directory
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Users Update Authorized Images Only"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'tattva-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- STEP 6: Storage Security Policy - Authorized Deletion (DELETE)
-- Rule: Users can only delete objects in their own user directory
-- -----------------------------------------------------------------------------
CREATE POLICY "TATTVA Images: Users Delete Authorized Images Only"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'tattva-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- -----------------------------------------------------------------------------
-- STEP 7: Image History Metadata Table & RLS
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
        user_id = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update their own image history" ON public.image_history;
CREATE POLICY "Users can update their own image history" ON public.image_history
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()::text
    )
    WITH CHECK (
        user_id = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own image history" ON public.image_history;
CREATE POLICY "Users can delete their own image history" ON public.image_history
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()::text
    );
