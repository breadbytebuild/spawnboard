import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentHuman } from "@/lib/auth/helpers";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { generateSlug } from "@/lib/utils";

const shareSchema = z.object({
  project_id: z.string().uuid(),
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
    return zodApiError(parsed.error, "project share");
  }

  const { project_id } = parsed.data;
  const admin = createAdminClient();

  // Verify human has access to this project's agent
  const { data: project } = await admin
    .from("projects")
    .select("id, name, workspaces!inner(agent_id)")
    .eq("id", project_id)
    .single();

  if (!project) {
    return apiError("NOT_FOUND", "Project not found");
  }

  const agentId = (project.workspaces as unknown as { agent_id: string }).agent_id;
  const { data: membership } = await admin
    .from("agent_members")
    .select("id")
    .eq("agent_id", agentId)
    .eq("human_id", human.id)
    .single();

  if (!membership) {
    return apiError("FORBIDDEN", "You don't have access to this project");
  }

  // Check if an active project share link already exists
  const { data: existing } = await admin
    .from("share_links")
    .select("id, slug")
    .eq("project_id", project_id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://spawnboard.com";

  if (existing) {
    return apiSuccess({
      url: `${baseUrl}/preview/project/${existing.slug}`,
      slug: existing.slug,
      created: false,
    });
  }

  // Get project name for slug (reuse the project we already fetched)
  const slug =
    generateSlug(project?.name || "project") +
    "-" +
    Math.random().toString(36).slice(2, 8);

  const { data: link, error } = await admin
    .from("share_links")
    .insert({ project_id, slug, is_active: true })
    .select("id, slug")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to create share link");
  }

  return apiSuccess({
    url: `${baseUrl}/preview/project/${link.slug}`,
    slug: link.slug,
    created: true,
  });
}
