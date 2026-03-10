import { createAdminClient } from "@/lib/supabase/admin";
import { apiError } from "./errors";
import bcrypt from "bcryptjs";

export interface AuthenticatedAgent {
  id: string;
  name: string;
  email: string;
  supabase_user_id: string;
}

export async function authenticateRequest(
  request: Request
): Promise<AuthenticatedAgent | Response> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return apiError("UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  const apiKey = authHeader.slice(7);

  if (!apiKey || apiKey.length < 10) {
    return apiError("UNAUTHORIZED", "Invalid API key");
  }

  const prefix = apiKey.slice(0, 8);
  const supabase = createAdminClient();

  // Filter by key_prefix first — reduces bcrypt comparisons to ~1
  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("key_hash, agent_id, agents(id, name, email, supabase_user_id)")
    .eq("is_active", true)
    .eq("key_prefix", prefix);

  if (error || !keys || keys.length === 0) {
    return apiError("UNAUTHORIZED", "Invalid API key");
  }

  for (const key of keys) {
    const match = await bcrypt.compare(apiKey, key.key_hash);
    if (match) {
      const agent = key.agents as unknown as AuthenticatedAgent;
      if (!agent) {
        return apiError("UNAUTHORIZED", "Agent not found");
      }

      // Update last_used_at (fire-and-forget)
      supabase
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_hash", key.key_hash)
        .then(() => {});

      return agent;
    }
  }

  return apiError("UNAUTHORIZED", "Invalid API key");
}

export function isAuthError(
  result: AuthenticatedAgent | Response
): result is Response {
  return result instanceof Response;
}
