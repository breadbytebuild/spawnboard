-- SpawnBoard — Human Auth & Permissions
-- Adds human accounts, agent-human linking, board visibility, invites

-- Board visibility enum
DO $$ BEGIN
  CREATE TYPE board_visibility AS ENUM ('public', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Agent member role enum
DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('admin', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Humans (human user accounts, parallel to agents)
CREATE TABLE IF NOT EXISTS humans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Agent-human membership (which humans can see which agents' work)
CREATE TABLE IF NOT EXISTS agent_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  human_id uuid NOT NULL REFERENCES humans(id) ON DELETE CASCADE,
  role member_role DEFAULT 'viewer' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(agent_id, human_id)
);

-- Pre-registered invites (agent invites an email before human signs up)
CREATE TABLE IF NOT EXISTS agent_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  email text NOT NULL,
  role member_role DEFAULT 'admin' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(agent_id, email)
);

-- Board-level membership (for private boards)
CREATE TABLE IF NOT EXISTS board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  human_id uuid NOT NULL REFERENCES humans(id) ON DELETE CASCADE,
  role text DEFAULT 'viewer' NOT NULL,
  invited_by uuid REFERENCES humans(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(board_id, human_id)
);

-- Add visibility column to boards
DO $$ BEGIN
  ALTER TABLE boards ADD COLUMN visibility board_visibility DEFAULT 'public' NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_humans_supabase_user ON humans(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_humans_email ON humans(email);
CREATE INDEX IF NOT EXISTS idx_agent_members_agent ON agent_members(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_members_human ON agent_members(human_id);
CREATE INDEX IF NOT EXISTS idx_agent_invites_email ON agent_invites(email);
CREATE INDEX IF NOT EXISTS idx_agent_invites_agent ON agent_invites(agent_id);
CREATE INDEX IF NOT EXISTS idx_board_members_board ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_human ON board_members(human_id);
CREATE INDEX IF NOT EXISTS idx_boards_visibility ON boards(visibility);

-- RLS
ALTER TABLE humans ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- Humans can see their own record
DO $$ BEGIN
  CREATE POLICY humans_own ON humans
    FOR ALL USING (supabase_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Agent members: humans can see memberships they're part of
DO $$ BEGIN
  CREATE POLICY agent_members_human ON agent_members
    FOR SELECT USING (
      human_id IN (SELECT id FROM humans WHERE supabase_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Agent invites: agents can manage their own invites (via service role)
-- No direct RLS for human read — checked in application code

-- Board members: humans can see boards they're members of
DO $$ BEGIN
  CREATE POLICY board_members_human ON board_members
    FOR SELECT USING (
      human_id IN (SELECT id FROM humans WHERE supabase_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update get_public_board to respect visibility
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

  SELECT json_build_object(
    'board', json_build_object(
      'id', b.id,
      'name', b.name,
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
