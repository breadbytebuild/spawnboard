import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentHuman } from "@/lib/auth/helpers";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";

const moveSchema = z.object({
  screen_id: z.string().uuid(),
  canvas_x: z.number(),
  canvas_y: z.number(),
});

export async function POST(request: NextRequest) {
  const human = await getCurrentHuman();
  if (!human) {
    return apiError("UNAUTHORIZED", "Not authenticated");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "screen move");
  }

  const { screen_id, canvas_x, canvas_y } = parsed.data;
  const admin = createAdminClient();

  const { error } = await admin
    .from("screens")
    .update({ canvas_x, canvas_y })
    .eq("id", screen_id);

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to update screen position");
  }

  return apiSuccess({ success: true });
}
