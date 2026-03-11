import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentHuman } from "@/lib/auth/helpers";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { generateSlug } from "@/lib/utils";

const shareSchema = z.object({
  board_id: z.string().uuid(),
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

  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "board share");
  }

  const { board_id } = parsed.data;
  const admin = createAdminClient();

  // Check if an active share link already exists
  const { data: existing } = await admin
    .from("share_links")
    .select("id, slug")
    .eq("board_id", board_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (existing) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.spawnboard.com";
    return apiSuccess({
      url: `${baseUrl}/preview/${existing.slug}`,
      slug: existing.slug,
      created: false,
    });
  }

  // Get board name for slug generation
  const { data: board } = await admin
    .from("boards")
    .select("name, display_name")
    .eq("id", board_id)
    .single();

  const slug =
    generateSlug(board?.display_name || board?.name || "board") +
    "-" +
    Math.random().toString(36).slice(2, 8);

  const { data: link, error } = await admin
    .from("share_links")
    .insert({ board_id, slug, is_active: true })
    .select("id, slug")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to create share link");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.spawnboard.com";
  return apiSuccess({
    url: `${baseUrl}/preview/${link.slug}`,
    slug: link.slug,
    created: true,
  });
}
