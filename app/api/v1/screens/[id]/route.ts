import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { deleteScreenFiles } from "@/lib/storage";

const updateScreenSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  canvas_x: z.number().optional(),
  canvas_y: z.number().optional(),
  canvas_scale: z.number().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source_html: z.string().max(2_000_000).optional(),
  source_css: z.string().max(500_000).optional(),
  context_md: z.string().max(100_000).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(500).optional(),
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
  if (!screen) return apiError("NOT_FOUND", `Screen '${screenId}' not found. Verify the screen ID is correct.`, { fix: "Call GET /boards/:id/screens to list screens in a board" });

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
  if (!existing) return apiError("NOT_FOUND", `Screen '${screenId}' not found. Verify the screen ID is correct.`, { fix: "Call GET /boards/:id/screens to list screens in a board" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body. Expected: { name?, canvas_x?, canvas_y?, canvas_scale?, metadata?, source_html?, source_css?, context_md?, tags?, description? }", { fix: "Send a valid JSON body with Content-Type: application/json" });
  }

  const parsed = updateScreenSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "screen update");
  }

  const updateFields: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateFields.name = parsed.data.name;
  if (parsed.data.canvas_x !== undefined) updateFields.canvas_x = parsed.data.canvas_x;
  if (parsed.data.canvas_y !== undefined) updateFields.canvas_y = parsed.data.canvas_y;
  if (parsed.data.canvas_scale !== undefined) updateFields.canvas_scale = parsed.data.canvas_scale;
  if (parsed.data.metadata !== undefined) updateFields.metadata = parsed.data.metadata;
  if (parsed.data.source_html !== undefined) updateFields.source_html = parsed.data.source_html;
  if (parsed.data.source_css !== undefined) updateFields.source_css = parsed.data.source_css;
  if (parsed.data.context_md !== undefined) updateFields.context_md = parsed.data.context_md;
  if (parsed.data.tags !== undefined) updateFields.tags = parsed.data.tags;
  if (parsed.data.description !== undefined) updateFields.description = parsed.data.description;

  if (Object.keys(updateFields).length === 0) {
    return apiError("BAD_REQUEST", "No fields to update. Accepts: { name?, canvas_x?, canvas_y?, canvas_scale?, metadata?, source_html?, source_css?, context_md?, tags?, description? }", { fix: "Include at least one field in your JSON body" });
  }

  // Snapshot to version history if content fields are changing
  const contentChanging =
    parsed.data.source_html !== undefined ||
    parsed.data.source_css !== undefined ||
    parsed.data.context_md !== undefined;

  if (contentChanging) {
    await supabase.from("screen_versions").insert({
      screen_id: screenId,
      version: existing.version || 1,
      image_url: existing.image_url,
      html_url: existing.html_url,
      source_html: existing.source_html,
      source_css: existing.source_css,
      context_md: existing.context_md,
      file_type: existing.file_type,
      file_size: existing.file_size,
      tags: existing.tags || [],
      description: existing.description,
      created_by_type: "agent",
      created_by_name: agent.name,
    }).then(() => {});

    updateFields.version = (existing.version || 1) + 1;
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
  if (!screen) return apiError("NOT_FOUND", `Screen '${screenId}' not found. Verify the screen ID is correct.`, { fix: "Call GET /boards/:id/screens to list screens in a board" });

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
