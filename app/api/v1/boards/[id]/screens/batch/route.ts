import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { autoLayoutPosition } from "@/lib/canvas/layout";

const batchScreenSchema = z.object({
  name: z.string().min(1).max(200),
  image_url: z.string().url().optional(),
  html_url: z.string().url().optional(),
  source_type: z.enum(["image", "html", "html_with_screenshot"]).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  canvas_x: z.number().optional(),
  canvas_y: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source_html: z.string().max(2_000_000).optional(),
  source_css: z.string().max(500_000).optional(),
  context_md: z.string().max(100_000).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(500).optional(),
});

const batchBodySchema = z.object({
  screens: z.array(batchScreenSchema).min(1, "At least one screen is required").max(50),
});

export async function POST(
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

  if (!board) return apiError("NOT_FOUND", `Board '${boardId}' not found. Verify the board ID is correct and belongs to your project.`, { fix: "Call GET /projects/:id/boards to list your boards" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body. Expected: { screens: [{ name: string, image_url?: string, html_url?: string, width?: number, height?: number, canvas_x?: number, canvas_y?: number }] }", { fix: "Send a JSON body with Content-Type: application/json containing a 'screens' array" });
  }

  const parsed = batchBodySchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "batch screen upload");
  }

  const { count } = await supabase
    .from("screens")
    .select("*", { count: "exact", head: true })
    .eq("board_id", boardId);

  const existingCount = count ?? 0;

  const rows = parsed.data.screens.map((s, i) => {
    const width = s.width ?? 393;
    const height = s.height ?? 852;

    let canvasX = s.canvas_x;
    let canvasY = s.canvas_y;

    if (canvasX == null || canvasY == null) {
      const pos = autoLayoutPosition(existingCount + i, width, height);
      canvasX = canvasX ?? pos.canvas_x;
      canvasY = canvasY ?? pos.canvas_y;
    }

    let sourceType = s.source_type;
    if (!sourceType) {
      if (s.image_url && s.html_url) sourceType = "html_with_screenshot";
      else if (s.html_url) sourceType = "html";
      else sourceType = "image";
    }

    return {
      board_id: boardId,
      name: s.name,
      image_url: s.image_url ?? null,
      html_url: s.html_url ?? null,
      source_type: sourceType,
      width,
      height,
      canvas_x: canvasX,
      canvas_y: canvasY,
      sort_order: existingCount + i,
      metadata: s.metadata ?? {},
      source_html: s.source_html ?? null,
      source_css: s.source_css ?? null,
      context_md: s.context_md ?? null,
      tags: s.tags ?? [],
      description: s.description ?? null,
    };
  });

  const { data: screens, error } = await supabase
    .from("screens")
    .insert(rows)
    .select();

  if (error) return apiError("INTERNAL_ERROR", "Failed to save batch screens. Server error — retry the request.", { fix: "Retry the request" });

  return apiSuccess({ screens }, 201);
}
