import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { generateSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const supabase = createAdminClient();

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_at")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch workspaces. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ workspaces });
}

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export async function POST(request: NextRequest) {
  const agent = await authenticateRequest(request);
  if (isAuthError(agent)) return agent;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body. Expected: { name: string }", { fix: "Send a JSON object with Content-Type: application/json" });
  }

  const parsed = createWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "workspace creation");
  }

  const { name } = parsed.data;
  const slug = generateSlug(name) + "-" + Math.random().toString(36).slice(2, 8);

  const supabase = createAdminClient();

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name, slug, agent_id: agent.id })
    .select("id, name, slug, created_at")
    .single();

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to create workspace. Server error — retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({ workspace }, 201);
}
