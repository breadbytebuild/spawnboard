import { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const supabase = createAdminClient();

  const { data: members, error } = await supabase
    .from("agent_members")
    .select("id, human_id, role, created_at, humans(name, email)")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to fetch members. Server error — retry the request.", {
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
