import { createAdminClient } from "@/lib/supabase/admin";
import { BoardCanvas } from "@/components/canvas/board-canvas";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BoardPage({ params }: Props) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    notFound();
  }

  const supabase = createAdminClient();

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, name, description, canvas_state")
    .eq("id", id)
    .single();

  if (boardError || !board) {
    notFound();
  }

  const { data: screens } = await supabase
    .from("screens")
    .select(
      "id, name, image_url, html_url, source_type, width, height, canvas_x, canvas_y, canvas_scale, sort_order, metadata"
    )
    .eq("board_id", id)
    .order("sort_order")
    .order("created_at")
    .limit(500);

  return (
    <div className="h-screen">
      <BoardCanvas
        screens={(screens || []).map((s) => ({
          id: s.id,
          name: s.name,
          image_url: s.image_url,
          html_url: s.html_url,
          source_type: s.source_type,
          width: s.width,
          height: s.height,
          canvas_x: s.canvas_x,
          canvas_y: s.canvas_y,
          canvas_scale: s.canvas_scale,
          sort_order: s.sort_order,
          metadata: (s.metadata as Record<string, unknown>) || {},
        }))}
        boardName={board.name}
      />
    </div>
  );
}
