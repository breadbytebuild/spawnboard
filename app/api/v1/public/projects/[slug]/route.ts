import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data } = await supabase.rpc("get_public_project", {
    share_slug: slug,
  });

  if (!data) {
    return apiError("NOT_FOUND", "Project not found. The share link may be invalid or expired.", {
      fix: "Check the share link slug is correct",
    });
  }

  return apiSuccess(data);
}
