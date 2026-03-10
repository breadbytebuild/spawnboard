import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentHuman } from "@/lib/auth/helpers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { redirect } from "next/navigation";

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

async function fetchNavigationTree(humanId: string | null): Promise<AgentTree[]> {
  const supabase = createAdminClient();

  let agentIds: string[] | null = null;

  if (humanId) {
    const { data: memberships } = await supabase
      .from("agent_members")
      .select("agent_id")
      .eq("human_id", humanId);

    if (memberships && memberships.length > 0) {
      agentIds = memberships.map((m) => m.agent_id);
    } else {
      return [];
    }
  }

  let query = supabase
    .from("agents")
    .select(
      `id, name, avatar_url,
      workspaces(
        id, name,
        projects(
          id, name,
          boards(id, name, display_name, sort_order, updated_at)
        )
      )`
    )
    .order("created_at", { ascending: false });

  if (agentIds) {
    query = query.in("id", agentIds);
  }

  const { data: agents } = await query;

  if (!agents) return [];

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
          display_name: string | null;
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
              name: b.display_name || b.name,
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
  const human = await getCurrentHuman();

  if (!human) {
    redirect("/login?redirect=/dashboard");
  }

  const agents = await fetchNavigationTree(human.id);

  return (
    <DashboardShell agents={agents} human={human}>
      {children}
    </DashboardShell>
  );
}
