import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { deleteScreenFiles } from "@/lib/storage";

const updateScreenSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  canvas_x: z.number().optional(),
  canvas_y: z.number().optional(),
  canvas_scale: z.number().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function getOwnedScreen(supabase: ReturnType<typeof createAdminClient>, screenId: string, agentId: string) {
  const { data } = await supabase
    .from("screens")
    .select("*, boards!inner(project_id, projects!inner(workspace_id, workspaces!inner(agent_id)))")
    .eq("id", screenId)
    .eq("boards.projects.workspaces.agent_id", agentId)
    .single();
  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: screenId } = await params;
  const supabase = createAdminClient();

  const screen = await getOwnedScreen(supabase, screenId, agent.id);
  if (!screen) return apiError("NOT_FOUND", "Screen not found");

  return apiSuccess({ screen });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: screenId } = await params;
  const supabase = createAdminClient();

  const existing = await getOwnedScreen(supabase, screenId, agent.id);
  if (!existing) return apiError("NOT_FOUND", "Screen not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = updateScreenSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const updateFields: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateFields.name = parsed.data.name;
  if (parsed.data.canvas_x !== undefined) updateFields.canvas_x = parsed.data.canvas_x;
  if (parsed.data.canvas_y !== undefined) updateFields.canvas_y = parsed.data.canvas_y;
  if (parsed.data.canvas_scale !== undefined) updateFields.canvas_scale = parsed.data.canvas_scale;
  if (parsed.data.metadata !== undefined) updateFields.metadata = parsed.data.metadata;

  if (Object.keys(updateFields).length === 0) {
    return apiError("BAD_REQUEST", "No fields to update");
  }

  const { data: screen, error } = await supabase
    .from("screens")
    .update(updateFields)
    .eq("id", screenId)
    .select()
    .single();

  if (error) return apiError("INTERNAL_ERROR", "Failed to update screen");

  return apiSuccess({ screen });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: screenId } = await params;
  const supabase = createAdminClient();

  const screen = await getOwnedScreen(supabase, screenId, agent.id);
  if (!screen) return apiError("NOT_FOUND", "Screen not found");

  try {
    await deleteScreenFiles(agent.id, screen.board_id, screenId);
  } catch {
    // best-effort storage cleanup
  }

  const { error } = await supabase
    .from("screens")
    .delete()
    .eq("id", screenId);

  if (error) return apiError("INTERNAL_ERROR", "Failed to delete screen");

  return apiSuccess({ deleted: true });
}
