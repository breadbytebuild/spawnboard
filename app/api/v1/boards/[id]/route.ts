import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", id)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) {
    return apiError("NOT_FOUND", `Board '${id}' not found. Verify the board ID is correct and belongs to your project.`, { fix: "Call GET /projects/:id/boards to list boards" });
  }

  const { data: screens } = await supabase
    .from("screens")
    .select("*")
    .eq("board_id", id)
    .order("sort_order")
    .order("created_at");

  const { projects: _, ...boardData } = board;
  return apiSuccess({ board: boardData, screens: screens ?? [] });
}

const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  display_name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  canvas_state: z.record(z.string(), z.unknown()).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  project_id: z.string().uuid().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("boards")
    .select("*, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", id)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", `Board '${id}' not found. Verify the board ID is correct and belongs to your project.`, { fix: "Call GET /projects/:id/boards to list boards" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body. Accepts: { name?: string, description?: string, canvas_state?: object }", { fix: "Send a JSON object with at least one field to update" });
  }

  const parsed = updateBoardSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "board update");
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return apiError("BAD_REQUEST", "No fields to update. Provide at least one of: name, display_name, description, canvas_state, visibility, project_id", { fix: "Include at least one field in your JSON body" });
  }

  // If moving to a different project, verify the target belongs to this agent
  if (updates.project_id) {
    const { data: targetProject } = await supabase
      .from("projects")
      .select("id, workspaces!inner(agent_id)")
      .eq("id", updates.project_id)
      .eq("workspaces.agent_id", agent.id)
      .single();

    if (!targetProject) {
      return apiError("NOT_FOUND", `Target project '${updates.project_id}' not found or doesn't belong to you.`, {
        fix: "Call GET /workspaces/:id/projects to list your projects",
      });
    }
  }

  const { data: board, error } = await supabase
    .from("boards")
    .update(updates)
    .eq("id", id)
    .select("id, project_id, name, display_name, description, canvas_state, visibility, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to update board. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ board });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("boards")
    .select("id, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", id)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", `Board '${id}' not found. Verify the board ID is correct and belongs to your project.`, { fix: "Call GET /projects/:id/boards to list boards" });
  }

  const { error } = await supabase.from("boards").delete().eq("id", id);

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to delete board. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ deleted: true });
}
