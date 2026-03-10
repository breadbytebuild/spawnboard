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

  const { data: screen } = await supabase
    .from("screens")
    .select(
      "image_url, html_url, name, original_name, file_type, file_size, boards!inner(project_id, projects!inner(workspace_id, workspaces!inner(agent_id)))"
    )
    .eq("id", screenId)
    .eq("boards.projects.workspaces.agent_id", agent.id)
    .single();

  if (!screen)
    return apiError("NOT_FOUND", `Screen '${screenId}' not found.`, {
      fix: "Verify the screen ID and that it belongs to your workspace",
    });

  const url = screen.image_url || screen.html_url;
  if (!url)
    return apiError(
      "NOT_FOUND",
      "No downloadable file for this screen — it has no stored image or HTML.",
      { fix: "Upload a file to this screen first via PATCH or the upload endpoint" }
    );

  const filename =
    screen.original_name ||
    `${screen.name}.${screen.file_type || "png"}`;

  return apiSuccess({
    download_url: url,
    filename,
    file_type: screen.file_type,
    file_size: screen.file_size,
  });
}
