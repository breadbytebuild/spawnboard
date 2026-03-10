import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { getCurrentHuman } from "@/lib/auth/helpers";

const createCommentSchema = z.object({
  board_id: z.string().uuid(),
  content: z.string().min(1).max(10000),
  pin_type: z.enum(["screen", "canvas"]).optional(),
  screen_id: z.string().uuid().optional(),
  pin_x: z.number(),
  pin_y: z.number(),
  parent_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const human = await getCurrentHuman();
  if (!human) {
    return apiError("UNAUTHORIZED", "You must be logged in to comment.", {
      fix: "Log in at /login first",
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

  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("id, projects!inner(workspaces!inner(agent_id))")
    .eq("id", parsed.data.board_id)
    .single();

  if (!board) return apiError("NOT_FOUND", "Board not found");

  const agentId = (board.projects as any).workspaces.agent_id;
  const { data: membership } = await supabase
    .from("agent_members")
    .select("id")
    .eq("agent_id", agentId)
    .eq("human_id", human.id)
    .single();

  if (!membership) return apiError("FORBIDDEN", "You don't have access to this board");

  if (parsed.data.parent_id) {
    const { data: parent } = await supabase
      .from("comments")
      .select("id, board_id")
      .eq("id", parsed.data.parent_id)
      .single();

    if (!parent || parent.board_id !== parsed.data.board_id) {
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
      .eq("board_id", parsed.data.board_id)
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
      ...parsed.data,
      pin_type: pinType,
      author_type: "human",
      human_id: human.id,
      author_name: human.name,
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
