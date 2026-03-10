import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*, workspaces!inner(agent_id)")
    .eq("id", id)
    .eq("workspaces.agent_id", agent.id)
    .single();

  if (!project) {
    return apiError("NOT_FOUND", `Project '${id}' not found. Verify the project ID is correct and belongs to your workspace.`, { fix: "Call GET /workspaces/:id/projects to list projects" });
  }

  const { workspaces: _, ...projectData } = project;
  return apiSuccess({ project: projectData });
}

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("projects")
    .select("*, workspaces!inner(agent_id)")
    .eq("id", id)
    .eq("workspaces.agent_id", agent.id)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", `Project '${id}' not found. Verify the project ID is correct and belongs to your workspace.`, { fix: "Call GET /workspaces/:id/projects to list projects" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body. Accepts: { name?: string, description?: string }", { fix: "Send a JSON object with at least one field to update" });
  }

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "project update");
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return apiError("BAD_REQUEST", "No fields to update. Provide at least one of: name, description", { fix: "Include at least one field in your JSON body" });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select("id, workspace_id, name, description, cover_image_url, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to update project. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ project });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("projects")
    .select("id, workspaces!inner(agent_id)")
    .eq("id", id)
    .eq("workspaces.agent_id", agent.id)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", `Project '${id}' not found. Verify the project ID is correct and belongs to your workspace.`, { fix: "Call GET /workspaces/:id/projects to list projects" });
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to delete project. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ deleted: true });
}
