import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentHuman } from "@/lib/auth/helpers";
import { redirect, notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BoardRedirectPage({ params }: Props) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const supabase = createAdminClient();
  const human = await getCurrentHuman();

  if (human) {
    // Check if this human has access to the board's agent
    const { data: board } = await supabase
      .from("boards")
      .select("id, projects!inner(workspaces!inner(agent_id))")
      .eq("id", id)
      .single();

    if (board) {
      const agentId = (board.projects as unknown as { workspaces: { agent_id: string } }).workspaces.agent_id;
      const { data: membership } = await supabase
        .from("agent_members")
        .select("id")
        .eq("agent_id", agentId)
        .eq("human_id", human.id)
        .single();

      if (membership) {
        redirect(`/dashboard/boards/${id}`);
      }
    }
    // Human is logged in but not linked — fall through to preview
  }

  // Find the public share link
  const { data: shareLink } = await supabase
    .from("share_links")
    .select("slug")
    .eq("board_id", id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (shareLink) {
    redirect(`/preview/${shareLink.slug}`);
  }

  // No share link — if logged in, send to dashboard (they'll see the board via admin client)
  // If not logged in, send to login
  if (human) {
    redirect(`/dashboard/boards/${id}`);
  }

  redirect(`/login?redirect=/board/${id}`);
}
