import { createAdminClient } from "@/lib/supabase/admin";
import { BoardCanvas } from "@/components/canvas/board-canvas";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: board } = await supabase
    .from("boards")
    .select("id, name, description, canvas_state")
    .eq("id", id)
    .single();

  if (!board) {
    notFound();
  }

  const { data: screens } = await supabase
    .from("screens")
    .select("*")
    .eq("board_id", id)
    .order("sort_order")
    .order("created_at");

  return (
    <div className="h-screen">
      <BoardCanvas
        screens={
          (screens || []).map((s) => ({
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
          }))
        }
        boardName={board.name}
      />
    </div>
  );
}
