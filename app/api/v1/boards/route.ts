import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const supabase = createAdminClient();

  // Get all boards across all the agent's projects
  const { data: boards, error } = await supabase
    .from("boards")
    .select(
      `id, name, display_name, description, visibility, sort_order, created_at, updated_at,
      projects!inner(id, name, workspaces!inner(agent_id))`
    )
    .eq("projects.workspaces.agent_id", agent.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch boards.", {
      fix: "Retry the request",
    });
  }

  // Strip the join data from the response, add project_name
  const cleaned = (boards || []).map((b) => {
    const project = b.projects as unknown as { id: string; name: string };
    return {
      id: b.id,
      name: b.name,
      display_name: b.display_name,
      description: b.description,
      visibility: b.visibility,
      project_id: project?.id,
      project_name: project?.name,
      sort_order: b.sort_order,
      created_at: b.created_at,
      updated_at: b.updated_at,
    };
  });

  return apiSuccess({ boards: cleaned });
}
