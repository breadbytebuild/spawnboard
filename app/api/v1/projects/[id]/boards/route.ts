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

  const { id: projectId } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, workspaces!inner(agent_id)")
    .eq("id", projectId)
    .eq("workspaces.agent_id", agent.id)
    .single();

  if (!project) {
    return apiError("NOT_FOUND", `Project '${projectId}' not found. Verify the project ID is correct and belongs to your workspace.`, { fix: "Call GET /workspaces/:id/projects to list projects" });
  }

  const { data: boards, error } = await supabase
    .from("boards")
    .select("id, project_id, name, description, canvas_state, sort_order, created_at, updated_at")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch boards. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ boards });
}

const createBoardSchema = z.object({
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

  const { id: projectId } = await params;
  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, workspaces!inner(agent_id)")
    .eq("id", projectId)
    .eq("workspaces.agent_id", agent.id)
    .single();

  if (!project) {
    return apiError("NOT_FOUND", `Project '${projectId}' not found. Verify the project ID is correct and belongs to your workspace.`, { fix: "Call GET /workspaces/:id/projects to list projects" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body. Expected: { name: string, description?: string }", { fix: "Send a JSON object with Content-Type: application/json" });
  }

  const parsed = createBoardSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "board creation");
  }

  const { name, description } = parsed.data;

  const { data: board, error } = await supabase
    .from("boards")
    .insert({ project_id: projectId, name, description })
    .select("id, project_id, name, description, canvas_state, sort_order, created_at, updated_at")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to create board. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ board }, 201);
}
