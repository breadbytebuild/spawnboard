import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";

const layoutItemSchema = z.object({
  id: z.string().uuid(),
  canvas_x: z.number(),
  canvas_y: z.number(),
  canvas_scale: z.number().positive().optional(),
});

const layoutBodySchema = z.object({
  screens: z.array(layoutItemSchema).min(1, "At least one screen is required"),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: boardId } = await params;
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) return apiError("NOT_FOUND", "Board not found");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = layoutBodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const updates = await Promise.all(
    parsed.data.screens.map(async (item) => {
      const updateData: Record<string, number> = {
        canvas_x: item.canvas_x,
        canvas_y: item.canvas_y,
      };
      if (item.canvas_scale != null) {
        updateData.canvas_scale = item.canvas_scale;
      }

      const { data, error } = await supabase
        .from("screens")
        .update(updateData)
        .eq("id", item.id)
        .eq("board_id", boardId)
        .select()
        .single();

      if (error || !data) return null;
      return data;
    })
  );

  const screens = updates.filter(Boolean);

  return apiSuccess({ screens });
}
