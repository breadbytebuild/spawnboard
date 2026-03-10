-- SpawnBoard — Public Board Access Function
-- SECURITY DEFINER bypasses RLS for preview pages

CREATE OR REPLACE FUNCTION get_public_board(share_slug text)
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
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'board', json_build_object(
      'id', b.id,
      'name', b.name,
      'description', b.description,
      'canvas_state', b.canvas_state,
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
          'metadata', s.metadata
        ) ORDER BY s.sort_order, s.created_at
      )
      FROM screens s WHERE s.board_id = b.id
    ), '[]'::json),
    'agent', json_build_object(
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
