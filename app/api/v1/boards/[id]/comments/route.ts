import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id: boardId } = await params;
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) {
    return apiError("NOT_FOUND", `Board '${boardId}' not found.`, {
      fix: "Call GET /projects/:id/boards to list boards",
    });
  }

  const url = new URL(request.url);
  const resolvedParam = url.searchParams.get("resolved");

  let query = supabase
    .from("comments")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  if (resolvedParam === "true") {
    query = query.eq("is_resolved", true);
  } else if (resolvedParam === "false") {
    query = query.eq("is_resolved", false);
  }

  const { data: comments, error } = await query;

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch comments.", {
      fix: "Retry the request",
    });
  }

  const all = comments ?? [];
  const topLevel = all.filter((c) => !c.parent_id);
  const byParent = new Map<string, typeof all>();
  for (const c of all) {
    if (c.parent_id) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
    }
  }

  const threaded = topLevel.map((c) => ({
    ...c,
    replies: byParent.get(c.id) ?? [],
  }));

  return apiSuccess({ comments: threaded });
}

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  pin_type: z.enum(["screen", "canvas"]).optional(),
  screen_id: z.string().uuid().optional(),
  pin_x: z.number(),
  pin_y: z.number(),
  parent_id: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id: boardId } = await params;
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) {
    return apiError("NOT_FOUND", `Board '${boardId}' not found.`, {
      fix: "Call GET /projects/:id/boards to list boards",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body.", {
      fix: "Send a JSON object with Content-Type: application/json",
    });
  }

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "comment creation");
  }

  if (parsed.data.parent_id) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, board_id")
      .eq("id", parsed.data.parent_id)
      .single();

    if (!parent || parent.board_id !== boardId) {
      return apiError("BAD_REQUEST", "Parent comment not found or belongs to a different board", {
        fix: "Ensure parent_id refers to a comment on the same board",
      });
    }
  }

  if (parsed.data.screen_id) {
    const { data: screen } = await supabase
      .from("screens")
      .select("id")
      .eq("id", parsed.data.screen_id)
      .eq("board_id", boardId)
      .single();

    if (!screen) {
      return apiError("BAD_REQUEST", "Screen not found on this board", {
        fix: "Ensure screen_id belongs to the specified board",
      });
    }
  }

  const pinType = parsed.data.screen_id ? "screen" : (parsed.data.pin_type || "canvas");

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      board_id: boardId,
      ...parsed.data,
      pin_type: pinType,
      author_type: "agent",
      agent_id: agent.id,
      author_name: agent.name,
    })
    .select("*")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to create comment.", {
      fix: "Retry the request",
    });
  }

  return apiSuccess({ comment }, 201);
}
