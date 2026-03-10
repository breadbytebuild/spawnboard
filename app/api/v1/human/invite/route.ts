import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

const inviteSchema = z.object({
  agent_id: z.string().uuid("Valid agent_id is required"),
  email: z.string().email("Valid email is required"),
  role: z.enum(["admin", "viewer"]).default("admin"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  // Session auth — get current human from Supabase cookie
  const supabaseSession = await createClient();
  const {
    data: { user },
  } = await supabaseSession.auth.getUser();

  if (!user) {
    return apiError("UNAUTHORIZED", "You must be logged in to invite team members.", {
      fix: "Log in at /login first",
    });
  }

  const admin = createAdminClient();

  const { data: currentHuman } = await admin
    .from("humans")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (!currentHuman) {
    return apiError("UNAUTHORIZED", "No SpawnBoard human account found for your session.", {
      fix: "Sign up at SpawnBoard first",
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", 'Invalid JSON body. Expected: { agent_id: string, email: string, role?: "admin" | "viewer" }', {
      fix: "Send a JSON object with Content-Type: application/json",
    });
  }

  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "invite creation");
  }

  const { agent_id, role } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  // Verify the current human is an admin of this agent
  const { data: membership } = await admin
    .from("agent_members")
    .select("role")
    .eq("agent_id", agent_id)
    .eq("human_id", currentHuman.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return apiError("FORBIDDEN", "You must be an admin of this agent to invite team members.", {
      fix: "Ask an existing admin to invite this person instead",
    });
  }

  // Upsert invite
  const { data: invite, error: inviteError } = await admin
    .from("agent_invites")
    .upsert(
      { agent_id, email, role },
      { onConflict: "agent_id,email" }
    )
    .select("id, email, role")
    .single();

  if (inviteError) {
    return apiError("INTERNAL_ERROR", "Failed to create invite. Server error — retry the request.", {
      fix: "Retry the request",
    });
  }

  // If the email already belongs to a SpawnBoard human, link them directly
  const { data: invitedHuman } = await admin
    .from("humans")
    .select("id")
    .eq("email", email)
    .single();

  if (invitedHuman) {
    await admin
      .from("agent_members")
      .upsert(
        { agent_id, human_id: invitedHuman.id, role },
        { onConflict: "agent_id,human_id" }
      );
  }

  return apiSuccess({ invite }, 201);
}
