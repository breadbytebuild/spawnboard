import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { generateSlug } from "@/lib/utils";

const createShareSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  expires_at: z.string().datetime().optional(),
});

export async function GET(
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

  const { data: shareLinks, error } = await supabase
    .from("share_links")
    .select("id, slug, is_active, expires_at, created_at")
    .eq("board_id", boardId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return apiError("INTERNAL_ERROR", "Failed to fetch share links");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.spawnboard.com";
  const links = shareLinks.map((link) => ({
    ...link,
    url: `${baseUrl}/preview/${link.slug}`,
  }));

  return apiSuccess({ share_links: links });
}

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
    .select("name, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) return apiError("NOT_FOUND", `Board '${boardId}' not found. Verify the board ID is correct and belongs to your project.`, { fix: "Call GET /projects/:id/boards to list your boards" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "share link creation");
  }

  const slug = parsed.data.slug || `${generateSlug(board.name)}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: existing } = await supabase
    .from("share_links")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return apiError("CONFLICT", `The slug '${slug}' is already taken. Choose a different slug or omit the slug field to auto-generate one.`, { fix: "Use a different slug value or let SpawnBoard generate one" });
  }

  const insertData: Record<string, unknown> = {
    board_id: boardId,
    slug,
    is_active: true,
  };

  if (parsed.data.expires_at) {
    insertData.expires_at = parsed.data.expires_at;
  }

  const { data: shareLink, error } = await supabase
    .from("share_links")
    .insert(insertData)
    .select()
    .single();

  if (error) return apiError("INTERNAL_ERROR", "Failed to create share link. Server error — retry the request.", { fix: "Retry the request" });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.spawnboard.com";

  return apiSuccess({
    share_link: {
      id: shareLink.id,
      slug: shareLink.slug,
      url: `${baseUrl}/preview/${shareLink.slug}`,
      is_active: shareLink.is_active,
      expires_at: shareLink.expires_at,
    },
  }, 201);
}
