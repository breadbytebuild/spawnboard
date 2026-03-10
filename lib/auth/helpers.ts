import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const admin = createAdminClient();
  const { data: human } = await admin
    .from("humans")
    .select("id, name, email, avatar_url, supabase_user_id")
    .eq("supabase_user_id", user.id)
    .single();

  return human ?? null;
}
