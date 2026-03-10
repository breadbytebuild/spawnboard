import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/api/errors";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError("UNAUTHORIZED", "Not authenticated");

  const body = await request.json();
  const { name, email } = body;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("humans")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (existing) return apiSuccess({ human: existing });

  const { data: human, error } = await admin
    .from("humans")
    .insert({
      supabase_user_id: user.id,
      name: name || email.split("@")[0],
      email,
    })
    .select("id, name, email")
    .single();

  if (error) return apiError("INTERNAL_ERROR", "Failed to create account");

  const { data: invites } = await admin
    .from("agent_invites")
    .select("id, agent_id, role")
    .eq("email", email.toLowerCase());

  if (invites && invites.length > 0) {
    await admin.from("agent_members").insert(
      invites.map((inv) => ({
        agent_id: inv.agent_id,
        human_id: human.id,
        role: inv.role,
      }))
    );
    await admin
      .from("agent_invites")
      .delete()
      .in(
        "id",
        invites.map((i) => i.id)
      );
  }

  return apiSuccess({ human });
}
