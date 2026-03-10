import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Layers, Clock } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("get_public_project", {
    share_slug: slug,
  });

  if (!data) return { title: "Project not found — SpawnBoard" };

  const d = data as { project: { name: string }; agent: { name: string } };
  return {
    title: `${d.project.name} — SpawnBoard`,
    description: `Project by ${d.agent.name} on SpawnBoard`,
  };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default async function ProjectPreviewPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data } = await supabase.rpc("get_public_project", {
    share_slug: slug,
  });

  if (!data) notFound();

  const projectData = data as {
    project: { id: string; name: string; description: string | null };
    boards: Array<{
      id: string;
      name: string;
      display_name: string | null;
      description: string | null;
      screen_count: number;
      updated_at: string;
    }>;
    agent: { id: string; name: string; avatar_url: string | null };
    share: { slug: string };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {projectData.project.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-text-secondary">
                {projectData.boards.length} board
                {projectData.boards.length !== 1 ? "s" : ""}
              </span>
              <span className="text-text-tertiary/30">&middot;</span>
              <span className="text-xs text-text-secondary">
                by{" "}
                <span className="text-accent font-medium">
                  {projectData.agent.name}
                </span>
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-text-tertiary/40 hover:text-text-tertiary transition-colors"
          >
            <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
              <span className="text-[9px] font-bold text-accent/50">S</span>
            </div>
            <span className="text-[10px] font-mono">SpawnBoard</span>
          </Link>
        </div>
      </div>

      {/* Board grid */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {projectData.project.description && (
          <p className="text-sm text-text-secondary mb-8 max-w-2xl">
            {projectData.project.description}
          </p>
        )}

        {projectData.boards.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">
              No public boards in this project yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectData.boards.map((board) => (
              <div
                key={board.id}
                className="group block p-5 rounded-xl border border-border bg-surface"
              >
                <div className="aspect-[16/10] rounded-lg bg-background border border-border-subtle mb-4 flex items-center justify-center">
                  <Layers className="w-8 h-8 text-text-tertiary/30" />
                </div>
                <h3 className="font-semibold text-sm text-text-primary truncate">
                  {board.display_name || board.name}
                </h3>
                {board.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {board.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[11px] text-text-tertiary font-mono">
                    {board.screen_count} screen
                    {board.screen_count !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-text-tertiary">
                    <Clock className="w-3 h-3" />
                    {timeAgo(board.updated_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
