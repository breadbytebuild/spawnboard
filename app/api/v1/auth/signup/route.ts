import { NextRequest } from "next/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { generateApiKey, generateSlug } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
    return apiError("BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0].message);
  }

  const { name, email, password } = parsed.data;
  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already")) {
      return apiError("CONFLICT", "An account with this email already exists");
    }
    return apiError("INTERNAL_ERROR", "Failed to create account");
  }

  const supabaseUserId = authData.user.id;

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({ supabase_user_id: supabaseUserId, name, email })
    .select("id, name, email")
    .single();

  if (agentError) {
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return apiError("INTERNAL_ERROR", "Failed to create agent record");
  }

  const rawApiKey = generateApiKey();
  const keyHash = await bcrypt.hash(rawApiKey, 12);
  const keyPrefix = rawApiKey.slice(0, 8);

  const { error: keyError } = await supabase
    .from("api_keys")
    .insert({ agent_id: agent.id, key_hash: keyHash, key_prefix: keyPrefix });

  if (keyError) {
    await supabase.auth.admin.deleteUser(supabaseUserId);
    return apiError("INTERNAL_ERROR", "Failed to create API key");
  }

  const workspaceName = `${name}'s Workspace`;
  const workspaceSlug = generateSlug(name) + "-" + Math.random().toString(36).slice(2, 8);

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({ name: workspaceName, slug: workspaceSlug, agent_id: agent.id })
    .select("id, name, slug")
    .single();

  if (workspaceError) {
    return apiError("INTERNAL_ERROR", "Failed to create default workspace");
  }

  return apiSuccess({
    agent: { id: agent.id, name: agent.name, email: agent.email },
    api_key: rawApiKey,
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
  });
}
