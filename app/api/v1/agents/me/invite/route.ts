import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

const inviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["admin", "viewer"]).default("admin"),
});

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;
  const agent = authResult;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", 'Invalid JSON body. Expected: { email: string, role?: "admin" | "viewer" }', {
      fix: "Send a JSON object with Content-Type: application/json",
    });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "invite creation");
  }

  const email = parsed.data.email.toLowerCase();
  const { role } = parsed.data;
  const supabase = createAdminClient();

  // Upsert: if invite already exists for this agent+email, update the role
  const { data: invite, error: inviteError } = await supabase
    .from("agent_invites")
    .upsert(
      { agent_id: agent.id, email, role },
      { onConflict: "agent_id,email" }
    )
    .select("id, email, role")
    .single();

  if (inviteError) {
    return apiError("INTERNAL_ERROR", "Failed to create invite. Server error — retry the request.", {
      fix: "Retry the request",
    });
  }

  // If this email already belongs to a SpawnBoard human, link them directly
  const { data: human } = await supabase
    .from("humans")
    .select("id")
    .eq("email", email)
    .single();

  if (human) {
    await supabase
      .from("agent_members")
      .upsert(
        { agent_id: agent.id, human_id: human.id, role },
        { onConflict: "agent_id,human_id" }
      );
  }

  return apiSuccess({ invite }, 201);
}
