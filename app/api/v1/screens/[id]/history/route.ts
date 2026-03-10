import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: screenId } = await params;
  const supabase = createAdminClient();

  // Verify ownership through the board->project->workspace->agent chain
  const { data: screen } = await supabase
    .from("screens")
    .select(
      "id, boards!inner(project_id, projects!inner(workspace_id, workspaces!inner(agent_id)))"
    )
    .eq("id", screenId)
    .eq("boards.projects.workspaces.agent_id", agent.id)
    .single();

  if (!screen)
    return apiError("NOT_FOUND", `Screen '${screenId}' not found.`, {
      fix: "Verify the screen ID and that it belongs to your workspace",
    });

  const { data: versions, error } = await supabase
    .from("screen_versions")
    .select("*")
    .eq("screen_id", screenId)
    .order("version", { ascending: false });

  if (error) return apiError("INTERNAL_ERROR", "Failed to fetch version history");

  return apiSuccess({ versions: versions || [] });
}
