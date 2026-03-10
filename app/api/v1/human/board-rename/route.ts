import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentHuman } from "@/lib/auth/helpers";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";

const renameSchema = z.object({
  board_id: z.string().uuid(),
  display_name: z.string().min(1).max(200),
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

  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "board rename");
  }

  const { board_id, display_name } = parsed.data;
  const admin = createAdminClient();

  const { error } = await admin
    .from("boards")
    .update({ display_name })
    .eq("id", board_id);

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to rename board");
  }

  return apiSuccess({ success: true, display_name });
}
