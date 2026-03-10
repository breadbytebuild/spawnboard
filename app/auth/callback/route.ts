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
      const email = (user.email || "").toLowerCase();
      const name =
        user.user_metadata?.name || email.split("@")[0] || "Human";

      // Upsert human record (handles race conditions)
      const { data: human } = await admin
        .from("humans")
        .upsert(
          { supabase_user_id: user.id, name, email },
          { onConflict: "supabase_user_id" }
        )
        .select("id")
        .single();

      if (human) {
        // Auto-link pending invites
        const { data: invites } = await admin
          .from("agent_invites")
          .select("id, agent_id, role")
          .eq("email", email);

        if (invites && invites.length > 0) {
          const { error: memberError } = await admin
            .from("agent_members")
            .upsert(
              invites.map((inv) => ({
                agent_id: inv.agent_id,
                human_id: human.id,
                role: inv.role,
              })),
              { onConflict: "agent_id,human_id" }
            );

          // Only delete invites if memberships were created successfully
          if (!memberError) {
            await admin
              .from("agent_invites")
              .delete()
              .in("id", invites.map((i) => i.id));
          }
        }
      }
    }
  }

  return NextResponse.redirect(new URL(redirect, request.url));
}
