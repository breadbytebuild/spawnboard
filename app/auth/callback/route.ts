import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("humans")
        .select("id")
        .eq("supabase_user_id", user.id)
        .single();

      if (!existing) {
        const name =
          user.user_metadata?.name || user.email?.split("@")[0] || "Human";
        const email = user.email!;

        const { data: human } = await admin
          .from("humans")
          .insert({ supabase_user_id: user.id, name, email })
          .select("id")
          .single();

        if (human) {
          const { data: invites } = await admin
            .from("agent_invites")
            .select("id, agent_id, role")
            .eq("email", email.toLowerCase());

          if (invites && invites.length > 0) {
            const memberships = invites.map((inv) => ({
              agent_id: inv.agent_id,
              human_id: human.id,
              role: inv.role,
            }));
            await admin.from("agent_members").insert(memberships);
            await admin
              .from("agent_invites")
              .delete()
              .in(
                "id",
                invites.map((i) => i.id)
              );
          }
        }
      }
    }
  }

  return NextResponse.redirect(new URL(redirect, request.url));
}
