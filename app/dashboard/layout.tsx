import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/dashboard/sidebar";

export interface AgentTree {
  id: string;
  name: string;
  avatar_url: string | null;
  projects: Array<{
    id: string;
    name: string;
    boards: Array<{
      id: string;
      name: string;
      screen_count: number;
      updated_at: string;
    }>;
  }>;
}

async function fetchNavigationTree(): Promise<AgentTree[]> {
  const supabase = createAdminClient();

  const { data: agents } = await supabase
    .from("agents")
    .select(
      `id, name, avatar_url,
      workspaces(
        id, name,
        projects(
          id, name,
          boards(id, name, sort_order, updated_at)
        )
      )`
    )
    .order("created_at", { ascending: false });

  if (!agents) return [];

  // Fetch screen counts per board in one query
  const { data: counts } = await supabase.rpc("get_board_screen_counts");
  const countMap = new Map<string, number>();
  if (counts) {
    for (const row of counts as Array<{ board_id: string; screen_count: number }>) {
      countMap.set(row.board_id, Number(row.screen_count));
    }
  }

  return agents.map((agent) => {
    const allProjects: AgentTree["projects"] = [];

    const workspaces = (agent.workspaces as Array<{
      id: string;
      name: string;
      projects: Array<{
        id: string;
        name: string;
        boards: Array<{
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        }>;
      }>;
    }>) || [];

    for (const ws of workspaces) {
      for (const project of ws.projects || []) {
        allProjects.push({
          id: project.id,
          name: project.name,
          boards: (project.boards || [])
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((b) => ({
              id: b.id,
              name: b.name,
              screen_count: countMap.get(b.id) || 0,
              updated_at: b.updated_at,
            })),
        });
      }
    }

    return {
      id: agent.id,
      name: agent.name as string,
      avatar_url: agent.avatar_url as string | null,
      projects: allProjects,
    };
  });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const agents = await fetchNavigationTree();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar agents={agents} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
