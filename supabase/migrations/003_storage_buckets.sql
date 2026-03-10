-- SpawnBoard — Storage Buckets
-- Run in Supabase SQL editor

-- Create the screens bucket (public read for serving images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screens',
  'screens',
  true,
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'text/html']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: agents can upload to their own folder
DO $$ BEGIN
  CREATE POLICY screens_upload ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'screens'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage RLS: public read for all screen files
DO $$ BEGIN
  CREATE POLICY screens_public_read ON storage.objects
    FOR SELECT USING (
      bucket_id = 'screens'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Storage RLS: agents can update/delete their own files
DO $$ BEGIN
  CREATE POLICY screens_manage ON storage.objects
    FOR DELETE USING (
      bucket_id = 'screens'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
