-- SpawnBoard — Smart Asset System
-- Adds rich metadata, version history, tags, and expanded format support

-- New columns on screens
DO $$ BEGIN ALTER TABLE screens ADD COLUMN file_type text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE screens ADD COLUMN file_size int; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE screens ADD COLUMN original_name text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE screens ADD COLUMN thumbnail_url text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE screens ADD COLUMN tags text[] DEFAULT '{}'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE screens ADD COLUMN description text; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE screens ADD COLUMN version int DEFAULT 1; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE screens ADD COLUMN previous_version_id uuid REFERENCES screens(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Version history table
CREATE TABLE IF NOT EXISTS screen_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  version int NOT NULL,
  image_url text,
  html_url text,
  source_html text,
  source_css text,
  context_md text,
  file_type text,
  file_size int,
  tags text[] DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by_type text,
  created_by_name text
);

CREATE INDEX IF NOT EXISTS idx_screen_versions_screen ON screen_versions(screen_id);
CREATE INDEX IF NOT EXISTS idx_screens_tags ON screens USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_screens_file_type ON screens(file_type);

ALTER TABLE screen_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY screen_versions_read ON screen_versions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Expand storage bucket to accept SVG, GIF, AVIF
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png', 'image/jpeg', 'image/webp',
  'image/svg+xml', 'image/gif', 'image/avif',
  'text/html'
]
WHERE id = 'screens';

-- Backfill file_type for existing screens based on image_url extension
UPDATE screens SET file_type = 'png' WHERE file_type IS NULL AND image_url LIKE '%.png';
UPDATE screens SET file_type = 'jpg' WHERE file_type IS NULL AND image_url LIKE '%.jpg';
UPDATE screens SET file_type = 'webp' WHERE file_type IS NULL AND image_url LIKE '%.webp';
UPDATE screens SET file_type = 'html' WHERE file_type IS NULL AND source_type = 'html';
UPDATE screens SET file_type = 'html' WHERE file_type IS NULL AND html_url IS NOT NULL;
