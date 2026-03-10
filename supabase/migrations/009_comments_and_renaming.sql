-- SpawnBoard — Comments System + Board Renaming
-- Full comments with threads, author tracking, pin modes, resolve/unresolve
-- Board display_name for human renaming without confusing agents

-- ============================================================
-- 1. Board renaming: display_name (human-facing alias)
-- ============================================================

DO $$ BEGIN
  ALTER TABLE boards ADD COLUMN display_name text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- 2. Drop old comments table and rebuild with full feature set
-- ============================================================

DROP TABLE IF EXISTS comments CASCADE;

-- Comment author type
DO $$ BEGIN
  CREATE TYPE comment_author_type AS ENUM ('human', 'agent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Comment pin type
DO $$ BEGIN
  CREATE TYPE comment_pin_type AS ENUM ('screen', 'canvas');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,

  -- Pinning: either to a screen or to the canvas
  pin_type comment_pin_type NOT NULL DEFAULT 'canvas',
  screen_id uuid REFERENCES screens(id) ON DELETE CASCADE,
  pin_x float NOT NULL DEFAULT 0,
  pin_y float NOT NULL DEFAULT 0,

  -- Author: either a human or an agent
  author_type comment_author_type NOT NULL,
  human_id uuid REFERENCES humans(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  author_name text NOT NULL,

  -- Content
  content text NOT NULL,

  -- Threading: parent_id for replies
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,

  -- State
  is_resolved boolean DEFAULT false NOT NULL,
  resolved_by uuid REFERENCES humans(id) ON DELETE SET NULL,
  resolved_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT comments_author_check CHECK (
    (author_type = 'human' AND human_id IS NOT NULL) OR
    (author_type = 'agent' AND agent_id IS NOT NULL)
  ),
  CONSTRAINT comments_pin_check CHECK (
    (pin_type = 'screen' AND screen_id IS NOT NULL) OR
    (pin_type = 'canvas')
  )
);

-- Indexes
CREATE INDEX idx_comments_board ON comments(board_id);
CREATE INDEX idx_comments_screen ON comments(screen_id) WHERE screen_id IS NOT NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_resolved ON comments(is_resolved, board_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Everyone linked to the board's agent can read comments
DO $$ BEGIN
  CREATE POLICY comments_read ON comments
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Humans and agents can create comments (validated in application layer)
DO $$ BEGIN
  CREATE POLICY comments_insert ON comments
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authors can update their own comments
DO $$ BEGIN
  CREATE POLICY comments_update ON comments
    FOR UPDATE USING (
      (author_type = 'human' AND human_id IN (SELECT id FROM humans WHERE supabase_user_id = auth.uid()))
      OR
      (author_type = 'agent')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authors can delete their own comments
DO $$ BEGIN
  CREATE POLICY comments_delete ON comments
    FOR DELETE USING (
      (author_type = 'human' AND human_id IN (SELECT id FROM humans WHERE supabase_user_id = auth.uid()))
      OR
      (author_type = 'agent')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. Update get_public_board to include display_name
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_board(share_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  link_record record;
  board_record record;
BEGIN
  SELECT * INTO link_record
  FROM share_links
  WHERE slug = share_slug
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO board_record
  FROM boards WHERE id = link_record.board_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF board_record.visibility = 'private' THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'board', json_build_object(
      'id', b.id,
      'name', b.name,
      'display_name', b.display_name,
      'description', b.description,
      'canvas_state', b.canvas_state,
      'visibility', b.visibility,
      'created_at', b.created_at,
      'updated_at', b.updated_at
    ),
    'screens', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'name', s.name,
          'image_url', s.image_url,
          'html_url', s.html_url,
          'source_type', s.source_type,
          'width', s.width,
          'height', s.height,
          'canvas_x', s.canvas_x,
          'canvas_y', s.canvas_y,
          'canvas_scale', s.canvas_scale,
          'sort_order', s.sort_order,
          'metadata', s.metadata,
          'source_html', s.source_html,
          'source_css', s.source_css,
          'context_md', s.context_md
        ) ORDER BY s.sort_order, s.created_at
      )
      FROM screens s WHERE s.board_id = b.id
    ), '[]'::json),
    'comments', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', c.id,
          'pin_type', c.pin_type,
          'screen_id', c.screen_id,
          'pin_x', c.pin_x,
          'pin_y', c.pin_y,
          'author_type', c.author_type,
          'author_name', c.author_name,
          'content', c.content,
          'parent_id', c.parent_id,
          'is_resolved', c.is_resolved,
          'created_at', c.created_at,
          'updated_at', c.updated_at
        ) ORDER BY c.created_at
      )
      FROM comments c WHERE c.board_id = b.id
    ), '[]'::json),
    'agent', json_build_object(
      'id', a.id,
      'name', a.name,
      'avatar_url', a.avatar_url
    ),
    'share', json_build_object(
      'slug', link_record.slug,
      'created_at', link_record.created_at
    )
  ) INTO result
  FROM boards b
  JOIN projects p ON p.id = b.project_id
  JOIN workspaces w ON w.id = p.workspace_id
  JOIN agents a ON a.id = w.agent_id
  WHERE b.id = link_record.board_id;

  RETURN result;
END;
$$;
