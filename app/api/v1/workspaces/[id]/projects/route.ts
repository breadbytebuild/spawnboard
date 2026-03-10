import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id: workspaceId } = await params;
  const supabase = createAdminClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("agent_id", agent.id)
    .single();

  if (!workspace) {
    return apiError("NOT_FOUND", "Workspace not found");
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, workspace_id, name, description, cover_image_url, sort_order, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch projects");
  }

  return apiSuccess({ projects });
}

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  const { id: workspaceId } = await params;
  const supabase = createAdminClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("agent_id", agent.id)
    .single();

  if (!workspace) {
    return apiError("NOT_FOUND", "Workspace not found");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const { name, description } = parsed.data;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ workspace_id: workspaceId, name, description })
    .select("id, workspace_id, name, description, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to create project");
  }

  return apiSuccess({ project }, 201);
}
