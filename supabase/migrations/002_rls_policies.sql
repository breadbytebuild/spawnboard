-- SpawnBoard — Row Level Security
-- All tables restricted to owning agent only

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Agents: users can only see their own agent record
DO $$ BEGIN
  CREATE POLICY agents_own ON agents
    FOR ALL USING (supabase_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- API keys: agents can manage their own keys
DO $$ BEGIN
  CREATE POLICY api_keys_own ON api_keys
    FOR ALL USING (
      agent_id IN (SELECT id FROM agents WHERE supabase_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Workspaces: agents can manage their own workspaces
DO $$ BEGIN
  CREATE POLICY workspaces_own ON workspaces
    FOR ALL USING (
      agent_id IN (SELECT id FROM agents WHERE supabase_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Projects: accessible if workspace is owned
DO $$ BEGIN
  CREATE POLICY projects_own ON projects
    FOR ALL USING (
      workspace_id IN (
        SELECT id FROM workspaces
        WHERE agent_id IN (SELECT id FROM agents WHERE supabase_user_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Boards: accessible if project is owned
DO $$ BEGIN
  CREATE POLICY boards_own ON boards
    FOR ALL USING (
      project_id IN (
        SELECT id FROM projects
        WHERE workspace_id IN (
          SELECT id FROM workspaces
          WHERE agent_id IN (SELECT id FROM agents WHERE supabase_user_id = auth.uid())
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Screens: accessible if board is owned
DO $$ BEGIN
  CREATE POLICY screens_own ON screens
    FOR ALL USING (
      board_id IN (
        SELECT id FROM boards
        WHERE project_id IN (
          SELECT id FROM projects
          WHERE workspace_id IN (
            SELECT id FROM workspaces
            WHERE agent_id IN (SELECT id FROM agents WHERE supabase_user_id = auth.uid())
          )
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Share links: managed by board owner
DO $$ BEGIN
  CREATE POLICY share_links_own ON share_links
    FOR ALL USING (
      board_id IN (
        SELECT id FROM boards
        WHERE project_id IN (
          SELECT id FROM projects
          WHERE workspace_id IN (
            SELECT id FROM workspaces
            WHERE agent_id IN (SELECT id FROM agents WHERE supabase_user_id = auth.uid())
          )
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Share links: public read for active links (used by preview pages)
DO $$ BEGIN
  CREATE POLICY share_links_public_read ON share_links
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Comments: anyone can read/write on boards with active share links
DO $$ BEGIN
  CREATE POLICY comments_public ON comments
    FOR ALL USING (
      board_id IN (SELECT board_id FROM share_links WHERE is_active = true)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
