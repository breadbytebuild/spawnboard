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

  const human = await getCurrentHuman();

  // Logged-in user → send to dashboard
  if (human) {
    redirect(`/dashboard/boards/${id}`);
  }

  // Not logged in → find the public share link and redirect to preview
  const supabase = createAdminClient();
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

  // No share link → send to login
  redirect(`/login?redirect=/dashboard/boards/${id}`);
}
