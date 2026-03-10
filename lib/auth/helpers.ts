import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface CurrentHuman {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  supabase_user_id: string;
}

export async function getCurrentHuman(): Promise<CurrentHuman | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if this is a human user (not an agent)
  const admin = createAdminClient();
  const { data: human } = await admin
    .from("humans")
    .select("id, name, email, avatar_url, supabase_user_id")
    .eq("supabase_user_id", user.id)
    .single();

  if (human) return human;

  // Check if this auth user is an agent (not a human)
  const { data: agent } = await admin
    .from("agents")
    .select("id")
    .eq("supabase_user_id", user.id)
    .single();

  if (agent) return null; // This is an agent, not a human

  // Fallback: auth user exists but no humans row — create one
  // This handles edge cases: confirmed email after failed initial setup,
  // or any code path that creates an auth user without a humans row.
  const email = (user.email || "").toLowerCase();
  const name =
    user.user_metadata?.name || email.split("@")[0] || "Human";

  const { data: newHuman } = await admin
    .from("humans")
    .upsert(
      { supabase_user_id: user.id, name, email },
      { onConflict: "supabase_user_id" }
    )
    .select("id, name, email, avatar_url, supabase_user_id")
    .single();

  if (!newHuman) return null;

  // Auto-link any pending invites
  const { data: invites } = await admin
    .from("agent_invites")
    .select("id, agent_id, role")
    .eq("email", email);

  if (invites && invites.length > 0) {
    await admin.from("agent_members").upsert(
      invites.map((inv) => ({
        agent_id: inv.agent_id,
        human_id: newHuman.id,
        role: inv.role,
      })),
      { onConflict: "agent_id,human_id" }
    );
    await admin
      .from("agent_invites")
      .delete()
      .in("id", invites.map((i) => i.id));
  }

  return newHuman;
}
