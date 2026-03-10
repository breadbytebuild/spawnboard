import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_at")
    .eq("id", id)
    .eq("agent_id", agent.id)
    .single();

  if (error || !workspace) {
    return apiError("NOT_FOUND", "Workspace not found");
  }

  return apiSuccess({ workspace });
}
