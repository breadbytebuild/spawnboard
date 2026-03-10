import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
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
    return apiError("NOT_FOUND", "Board not found");
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
  description: z.string().max(500).optional(),
  canvas_state: z.record(z.string(), z.unknown()).optional(),
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
    return apiError("NOT_FOUND", "Board not found");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = updateBoardSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return apiError("BAD_REQUEST", "No fields to update");
  }

  const { data: board, error } = await supabase
    .from("boards")
    .update(updates)
    .eq("id", id)
    .select("id, project_id, name, description, canvas_state, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to update board");
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
    return apiError("NOT_FOUND", "Board not found");
  }

  const { error } = await supabase.from("boards").delete().eq("id", id);

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to delete board");
  }

  return apiSuccess({ deleted: true });
}
