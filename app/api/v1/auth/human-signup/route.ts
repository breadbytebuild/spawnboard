import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: z.string().min(8),
  agent_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "human signup");
  }

  const { name, email, password, agent_id } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const admin = createAdminClient();

  // Create Supabase auth user with email confirmation skipped
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name, user_type: "human" },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already")) {
      return apiError("CONFLICT", "An account with this email already exists. Try logging in instead.", {
        fix: "Go to /login to sign in, or use a different email",
      });
    }
    return apiError("INTERNAL_ERROR", "Failed to create account. Try again.", {
      fix: "Retry the request",
    });
  }

  const userId = authData.user.id;

  // Create humans row
  const { data: human, error: humanError } = await admin
    .from("humans")
    .insert({
      supabase_user_id: userId,
      name,
      email: normalizedEmail,
    })
    .select("id, name, email")
    .single();

  if (humanError) {
    await admin.auth.admin.deleteUser(userId);
    return apiError("INTERNAL_ERROR", "Failed to create account profile. Try again.", {
      fix: "Retry the request",
    });
  }

  // Auto-link via agent_invites
  const { data: invites } = await admin
    .from("agent_invites")
    .select("id, agent_id, role")
    .eq("email", normalizedEmail);

  if (invites && invites.length > 0) {
    const { error: memberError } = await admin.from("agent_members").upsert(
      invites.map((inv) => ({
        agent_id: inv.agent_id,
        human_id: human.id,
        role: inv.role,
      })),
      { onConflict: "agent_id,human_id" }
    );

    if (!memberError) {
      await admin
        .from("agent_invites")
        .delete()
        .in("id", invites.map((i) => i.id));
    }
  }

  // Direct link from preview funnel (agent_id from signup URL)
  if (agent_id && (!invites || invites.length === 0 || !invites.some((i) => i.agent_id === agent_id))) {
    await admin.from("agent_members").upsert(
      { agent_id, human_id: human.id, role: "viewer" },
      { onConflict: "agent_id,human_id" }
    ).then(() => {});
  }

  // Sign in the new user so they get a session
  const { data: session } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
  });

  return apiSuccess({
    human: { id: human.id, name: human.name, email: human.email },
    session_url: session?.properties?.action_link || null,
  });
}
