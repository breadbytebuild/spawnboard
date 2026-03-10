-- SpawnBoard — Security Hardening
-- Fixes: storage policies too permissive, share_links public read leaks data,
-- comments policy too broad, missing CHECK constraints

-- ============================================================
-- 1. Fix share_links_public_read policy (leaks all active slugs)
-- Remove the overly broad public read policy.
-- The get_public_board() function uses SECURITY DEFINER and doesn't need it.
-- ============================================================
DROP POLICY IF EXISTS share_links_public_read ON share_links;

-- ============================================================
-- 2. Fix comments policy (grants ALL to anyone)
-- Split into read-only for shared boards, write restricted
-- ============================================================
DROP POLICY IF EXISTS comments_public ON comments;

DO $$ BEGIN
  CREATE POLICY comments_select ON comments
    FOR SELECT USING (
      board_id IN (SELECT board_id FROM share_links WHERE is_active = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY comments_insert ON comments
    FOR INSERT WITH CHECK (
      board_id IN (SELECT board_id FROM share_links WHERE is_active = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. Fix storage policies (any user can upload/delete any file)
-- Tighten to only allow operations via service role (API routes).
-- Drop overly permissive policies; API uses admin client which bypasses RLS.
-- ============================================================
DROP POLICY IF EXISTS screens_upload ON storage.objects;
DROP POLICY IF EXISTS screens_manage ON storage.objects;
DROP POLICY IF EXISTS screens_update ON storage.objects;

-- Public read stays (needed for image serving)
-- screens_public_read already exists and is correct

-- ============================================================
-- 4. Add CHECK constraints for data integrity
-- ============================================================

-- Screens: width and height must be positive
DO $$ BEGIN
  ALTER TABLE screens ADD CONSTRAINT screens_width_positive CHECK (width > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE screens ADD CONSTRAINT screens_height_positive CHECK (height > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE screens ADD CONSTRAINT screens_scale_positive CHECK (canvas_scale > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- At least one URL must be present
DO $$ BEGIN
  ALTER TABLE screens ADD CONSTRAINT screens_has_content
    CHECK (image_url IS NOT NULL OR html_url IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Share link slug format
DO $$ BEGIN
  ALTER TABLE share_links ADD CONSTRAINT share_links_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 5. Add missing indexes for performance
-- ============================================================

-- Composite index for screen listing (common query pattern)
CREATE INDEX IF NOT EXISTS idx_screens_board_sort
  ON screens(board_id, sort_order, created_at);

-- API key prefix lookup (used by auth middleware)
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix_active
  ON api_keys(key_prefix) WHERE is_active = true;

-- Share links active filter
CREATE INDEX IF NOT EXISTS idx_share_links_active_slug
  ON share_links(slug) WHERE is_active = true;

-- ============================================================
-- 6. Add updated_at to tables that need it
-- ============================================================

DO $$ BEGIN
  ALTER TABLE workspaces ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_workspaces_updated_at ON workspaces;
CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DO $$ BEGIN
  ALTER TABLE share_links ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_share_links_updated_at ON share_links;
CREATE TRIGGER trg_share_links_updated_at
  BEFORE UPDATE ON share_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
