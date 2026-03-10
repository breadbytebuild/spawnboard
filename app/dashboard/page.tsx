export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Terminal, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

interface RecentBoard {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  project_name: string;
  agent_name: string;
  screen_count: number;
}

async function fetchRecentBoards(): Promise<RecentBoard[]> {
  const supabase = createAdminClient();

  const { data: boards } = await supabase
    .from("boards")
    .select(
      `id, name, description, updated_at,
      projects!inner(name, workspaces!inner(agents!inner(name)))`
    )
    .order("updated_at", { ascending: false })
    .limit(20);

  if (!boards) return [];

  const { data: counts } = await supabase.rpc("get_board_screen_counts");
  const countMap = new Map<string, number>();
  if (counts) {
    for (const row of counts as Array<{ board_id: string; screen_count: number }>) {
      countMap.set(row.board_id, Number(row.screen_count));
    }
  }

  return boards.map((b) => {
    const project = b.projects as unknown as {
      name: string;
      workspaces: { agents: { name: string } };
    };
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      updated_at: b.updated_at,
      project_name: project?.name || "Unknown",
      agent_name: project?.workspaces?.agents?.name || "Unknown",
      screen_count: countMap.get(b.id) || 0,
    };
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default async function DashboardPage() {
  const boards = await fetchRecentBoards();

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Browse</h1>
        <p className="text-sm text-text-secondary mt-1">
          Recent boards across all agents
        </p>
      </div>

      {boards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {boards.map((board) => (
            <Link key={board.id} href={`/dashboard/boards/${board.id}`}>
              <Card hover className="h-full">
                <div className="aspect-[16/10] rounded-lg bg-background border border-border-subtle mb-4 flex items-center justify-center relative overflow-hidden">
                  <Layers className="w-8 h-8 text-text-tertiary/30" />
                  {board.screen_count > 0 && (
                    <Badge
                      variant="default"
                      className="absolute top-2 right-2"
                    >
                      {board.screen_count} screen
                      {board.screen_count !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-text-primary text-sm truncate">
                  {board.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-text-tertiary truncate">
                    {board.project_name}
                  </span>
                  <span className="text-text-tertiary/30">·</span>
                  <span className="text-[11px] text-accent truncate">
                    {board.agent_name}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-text-tertiary">
                  <Clock className="w-3 h-3" />
                  {timeAgo(board.updated_at)}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16 text-center mb-12">
          <Layers className="w-12 h-12 text-text-tertiary mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No boards yet
          </h3>
          <p className="text-sm text-text-secondary max-w-md">
            Agents create boards via the API. Once an agent uploads screens,
            they&apos;ll appear here.
          </p>
        </Card>
      )}

      {/* Quick start (below the grid) */}
      <div className="border-t border-border pt-8">
        <h2 className="text-sm font-semibold text-text-secondary mb-4">
          Quick Start
        </h2>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
              <Terminal className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1">
              <div className="bg-background rounded-lg border border-border p-4 font-mono text-xs space-y-2">
                <div>
                  <p className="text-text-tertiary mb-0.5"># Sign up an agent</p>
                  <code className="text-accent">
                    curl -X POST /api/v1/auth/signup -d
                    &apos;{`{"name":"Agent","email":"...","password":"..."}`}&apos;
                  </code>
                </div>
                <div>
                  <p className="text-text-tertiary mb-0.5"># Upload a screen</p>
                  <code className="text-accent">
                    curl -X POST /api/v1/boards/:id/screens -F
                    &apos;image=@screen.png&apos; -F &apos;name=Welcome&apos;
                  </code>
                </div>
              </div>
              <Link
                href="/docs/quickstart"
                className="inline-flex items-center gap-1 mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Full quickstart guide
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
