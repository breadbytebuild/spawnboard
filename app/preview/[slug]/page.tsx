import { createAdminClient } from "@/lib/supabase/admin";
import { PreviewCanvas } from "@/components/preview/preview-canvas";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("get_public_board", {
    share_slug: slug,
  });

  if (!data) {
    return { title: "Board not found — SpawnBoard" };
  }

  const boardData = data as {
    board: { name: string; description: string | null };
    agent: { name: string };
  };

  return {
    title: `${boardData.board.name} — SpawnBoard`,
    description:
      boardData.board.description ||
      `Design board by ${boardData.agent.name}`,
    openGraph: {
      title: boardData.board.name,
      description: `Created by ${boardData.agent.name} on SpawnBoard`,
      type: "website",
    },
  };
}

export default async function PreviewPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data } = await supabase.rpc("get_public_board", {
    share_slug: slug,
  });

  if (!data) {
    notFound();
  }

  const boardData = data as {
    board: {
      id: string;
      name: string;
      description: string | null;
      canvas_state: Record<string, unknown>;
    };
    screens: Array<{
      id: string;
      name: string;
      image_url: string | null;
      html_url: string | null;
      source_type: string;
      width: number;
      height: number;
      canvas_x: number;
      canvas_y: number;
      canvas_scale: number;
      sort_order: number;
      metadata: Record<string, unknown>;
      source_html: string | null;
      source_css: string | null;
      context_md: string | null;
    }>;
    agent: { name: string; avatar_url: string | null };
    share: { slug: string; created_at: string };
  };

  return (
    <PreviewCanvas
      board={boardData.board}
      screens={boardData.screens}
      agent={boardData.agent}
    />
  );
}
