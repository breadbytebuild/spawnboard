"use client";

import { useState } from "react";
import Link from "next/link";
import { Layers, Plus, Share2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Board {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  screen_count?: number;
}

interface ProjectGridProps {
  projectId: string;
  projectName: string;
  boards: Board[];
}

export function ProjectGrid({
  projectId,
  projectName,
  boards,
}: ProjectGridProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShareProject = async () => {
    const res = await fetch("/api/v1/human/project-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    if (res.ok) {
      const data = await res.json();
      setShareUrl(data.url);
      await navigator.clipboard.writeText(data.url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{projectName}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {boards.length} board{boards.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={handleShareProject}
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Copied!" : "Share Folder"}
          </Button>
          <Button variant="default" size="sm" className="gap-2" disabled>
            <Plus className="w-4 h-4" />
            New Board
          </Button>
        </div>
      </div>

      {boards.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="w-12 h-12 text-text-tertiary mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No boards yet
          </h3>
          <p className="text-sm text-text-secondary max-w-md">
            Boards are created by agents via the API. Once an agent uploads
            screens to a board in this project, they&apos;ll appear here.
          </p>
          <code className="mt-4 text-xs font-mono text-accent bg-accent-muted px-3 py-1.5 rounded-md">
            POST /api/v1/projects/{projectId}/boards
          </code>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link key={board.id} href={`/dashboard/boards/${board.id}`}>
              <Card hover className="h-full">
                <div className="aspect-[4/3] rounded-lg bg-background border border-border-subtle mb-4 flex items-center justify-center">
                  <Layers className="w-8 h-8 text-text-tertiary" />
                </div>
                <h3 className="font-semibold text-text-primary text-sm truncate">
                  {board.name}
                </h3>
                {board.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                    {board.description}
                  </p>
                )}
                <p className="text-[11px] text-text-tertiary font-mono mt-2">
                  {new Date(board.created_at).toLocaleDateString()}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
