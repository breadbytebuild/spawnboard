import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: shareLinkId } = await params;
  const supabase = createAdminClient();

  const { data: shareLink } = await supabase
    .from("share_links")
    .select("*, boards!inner(project_id, projects!inner(workspace_id, workspaces!inner(agent_id)))")
    .eq("id", shareLinkId)
    .eq("boards.projects.workspaces.agent_id", agent.id)
    .single();

  if (!shareLink) return apiError("NOT_FOUND", `Share link '${shareLinkId}' not found. Verify the share link ID (not the slug).`, { fix: "Call GET /boards/:id/share to list share links for a board" });

  const { error } = await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("id", shareLinkId);

  if (error) return apiError("INTERNAL_ERROR", "Failed to deactivate share link");

  return apiSuccess({ deactivated: true });
}
