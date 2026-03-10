import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, apiSuccess } from "@/lib/api/errors";
import { authenticateRequest, isAuthError } from "@/lib/api/auth";
import { generateApiKey } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (isAuthError(authResult)) return authResult;

  const agent = authResult;
  const supabase = createAdminClient();

  const rawApiKey = generateApiKey();
  const keyHash = await bcrypt.hash(rawApiKey, 12);
  const keyPrefix = rawApiKey.slice(0, 8);

  const { error } = await supabase
    .from("api_keys")
    .insert({ agent_id: agent.id, key_hash: keyHash, key_prefix: keyPrefix });

  if (error) {
    return apiError("INTERNAL_ERROR", "Failed to generate new API key. Retry the request.", { fix: "Retry the request" });
  }

  return apiSuccess({
    api_key: rawApiKey,
    prefix: keyPrefix,
  });
}
