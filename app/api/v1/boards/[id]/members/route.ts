import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

const addMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["viewer", "editor"]).default("viewer"),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const { id: boardId } = await params;
  const supabase = createAdminClient();

  // Verify board ownership through the hierarchy
  const { data: board } = await supabase
    .from("boards")
    .select("id, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) {
    return apiError("NOT_FOUND", `Board '${boardId}' not found. Verify the board ID is correct and belongs to your project.`, {
      fix: "Call GET /projects/:id/boards to list your boards",
    });
  }

  const { data: members, error } = await supabase
    .from("board_members")
    .select("id, human_id, role, created_at, humans(name, email)")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch board members. Server error — retry the request.", {
      fix: "Retry the request",
    });
  }

  const formatted = (members ?? []).map((m) => {
    const human = m.humans as unknown as { name: string; email: string } | null;
    return {
      id: m.id,
      human_id: m.human_id,
      name: human?.name ?? null,
      email: human?.email ?? null,
      role: m.role,
      created_at: m.created_at,
    };
  });

  return apiSuccess({ members: formatted });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  const { id: boardId } = await params;
  const supabase = createAdminClient();

  // Verify board ownership
  const { data: board } = await supabase
    .from("boards")
    .select("id, projects!inner(workspace_id, workspaces!inner(agent_id))")
    .eq("id", boardId)
    .eq("projects.workspaces.agent_id", agent.id)
    .single();

  if (!board) {
    return apiError("NOT_FOUND", `Board '${boardId}' not found. Verify the board ID is correct and belongs to your project.`, {
      fix: "Call GET /projects/:id/boards to list your boards",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", 'Invalid JSON body. Expected: { email: string, role?: "viewer" | "editor" }', {
      fix: "Send a JSON object with Content-Type: application/json",
    });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "board member addition");
  }

  const email = parsed.data.email.toLowerCase();
  const { role } = parsed.data;

  // Look up the human by email
  const { data: human } = await supabase
    .from("humans")
    .select("id, name, email")
    .eq("email", email)
    .single();

  if (!human) {
    return apiError("NOT_FOUND", `No SpawnBoard account found for '${email}'. The user needs to sign up first.`, {
      fix: "Ask the user to create an account at SpawnBoard, then retry",
    });
  }

  const { data: member, error: insertError } = await supabase
    .from("board_members")
    .upsert(
      { board_id: boardId, human_id: human.id, role },
      { onConflict: "board_id,human_id" }
    )
    .select("id, human_id, role, created_at")
    .single();

  if (insertError) {
    return apiError("INTERNAL_ERROR", "Failed to add board member. Server error — retry the request.", {
      fix: "Retry the request",
    });
  }

  return apiSuccess({
    member: {
      ...member,
      name: human.name,
      email: human.email,
    },
  }, 201);
}
