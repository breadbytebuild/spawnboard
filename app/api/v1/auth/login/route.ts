import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess, zodApiError } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const allowed = checkRateLimit(ip);
  if (!allowed) {
    return apiError("RATE_LIMITED", "Rate limit exceeded. Try again later.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_REQUEST", "Invalid JSON body. Send a JSON object with: email (string), password (string)", { fix: "Ensure Content-Type is application/json and body is valid JSON" });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error, "login request");
  }

  const { email, password } = parsed.data;
  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return apiError("UNAUTHORIZED", "Invalid email or password. Check your credentials and try again.", { fix: "Verify your email and password are correct" });
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, name, email")
    .eq("supabase_user_id", authData.user.id)
    .single();

  if (agentError || !agent) {
    return apiError("NOT_FOUND", "Auth succeeded but no agent profile found. This account may have been partially created. Try signing up again with this email.", { fix: "Call POST /auth/signup to create a new account" });
  }

  return apiSuccess({
    agent: { id: agent.id, name: agent.name, email: agent.email },
    session_token: authData.session.access_token,
  });
}
