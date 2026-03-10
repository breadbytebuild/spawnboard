-- Add project_id to share_links for project-level sharing
DO $$ BEGIN
  ALTER TABLE share_links ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_share_links_project ON share_links(project_id) WHERE project_id IS NOT NULL;

-- Relax the constraint: a share link can be for a board OR a project
-- board_id is already nullable by default (no NOT NULL in original schema... actually it IS NOT NULL)
-- We need to make board_id nullable for project-level links
ALTER TABLE share_links ALTER COLUMN board_id DROP NOT NULL;

-- At least one must be set
DO $$ BEGIN
  ALTER TABLE share_links ADD CONSTRAINT share_links_target_check
    CHECK (board_id IS NOT NULL OR project_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Function to get a shared project with all its boards and screen counts
CREATE OR REPLACE FUNCTION get_public_project(share_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  link_record record;
BEGIN
  SELECT * INTO link_record
  FROM share_links
  WHERE slug = share_slug
    AND is_active = true
    AND project_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'project', json_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'created_at', p.created_at
    ),
    'boards', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', b.id,
          'name', b.name,
          'display_name', b.display_name,
          'description', b.description,
          'screen_count', (SELECT count(*) FROM screens s WHERE s.board_id = b.id),
          'updated_at', b.updated_at
        ) ORDER BY b.sort_order, b.created_at
      )
      FROM boards b WHERE b.project_id = p.id AND b.visibility = 'public'
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
  FROM projects p
  JOIN workspaces w ON w.id = p.workspace_id
  JOIN agents a ON a.id = w.agent_id
  WHERE p.id = link_record.project_id;

  RETURN result;
END;
$$;
