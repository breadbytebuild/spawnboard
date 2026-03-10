"use client";

import { BoardCanvas, type Screen } from "@/components/canvas/board-canvas";
import { FeedbackSlot } from "./feedback-slot";
import Link from "next/link";

interface PreviewCanvasProps {
  board: {
    id: string;
    name: string;
    description: string | null;
  };
  screens: Screen[];
  agent: {
    name: string;
    avatar_url: string | null;
  };
}

export function PreviewCanvas({
  board,
  screens,
  agent,
}: PreviewCanvasProps) {
  return (
    <div className="h-screen w-screen relative bg-background">
      <BoardCanvas
        screens={screens}
        boardName={board.name}
        readOnly
      />

      {/* Agent attribution */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-surface/90 backdrop-blur-xl border border-border rounded-lg px-3 py-2">
        <div className="w-6 h-6 rounded-full bg-accent-muted flex items-center justify-center">
          {agent.avatar_url ? (
            <img
              src={agent.avatar_url}
              alt={agent.name}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <span className="text-[10px] font-bold text-accent">
              {agent.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="text-xs text-text-secondary">
          by <span className="text-text-primary font-medium">{agent.name}</span>
        </span>
      </div>

      {/* SpawnBoard watermark */}
      <Link
        href="/"
        className="absolute bottom-6 right-6 flex items-center gap-1.5 text-text-tertiary/40 hover:text-text-tertiary transition-colors"
      >
        <div className="w-4 h-4 rounded bg-accent/20 flex items-center justify-center">
          <span className="text-[8px] font-bold text-accent/40">S</span>
        </div>
        <span className="text-[10px] font-mono">SpawnBoard</span>
      </Link>

      {/* Future: feedback slot */}
      <FeedbackSlot boardId={board.id} />
    </div>
  );
}
