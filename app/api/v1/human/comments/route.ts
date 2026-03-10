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

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      ...parsed.data,
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
