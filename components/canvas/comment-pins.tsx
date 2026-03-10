"use client";

import { cn } from "@/lib/utils";
import type { Comment } from "./board-canvas";
import type { Screen } from "./board-canvas";

interface CommentPinsProps {
  comments: Comment[];
  screens: Screen[];
  onPinClick: (comment: Comment) => void;
  zoom: number;
}

function resolvePosition(
  comment: Comment,
  screens: Screen[]
): { x: number; y: number } | null {
  if (comment.pin_type === "canvas") {
    return { x: comment.pin_x, y: comment.pin_y };
  }
  const screen = screens.find((s) => s.id === comment.screen_id);
  if (!screen) return null;
  return {
    x: screen.canvas_x + comment.pin_x,
    y: screen.canvas_y + comment.pin_y,
  };
}

const PIN_SIZE = 24;

export function CommentPins({
  comments,
  screens,
  onPinClick,
  zoom,
}: CommentPinsProps) {
  const topLevel = comments.filter((c) => !c.parent_id);
  const scaledSize = PIN_SIZE / Math.max(zoom, 0.3);

  return (
    <>
      {topLevel.map((comment) => {
        const pos = resolvePosition(comment, screens);
        if (!pos) return null;

        const isResolved = comment.is_resolved;
        const isAgent = comment.author_type === "agent";
        const letter = comment.author_name.charAt(0).toUpperCase();

        return (
          <button
            key={comment.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPinClick(comment);
            }}
            className={cn(
              "absolute flex items-center justify-center rounded-full",
              "font-semibold border-2 border-background shadow-lg shadow-black/40",
              "transition-transform duration-100 hover:scale-125 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isResolved
                ? "bg-text-tertiary/60 text-background/80"
                : isAgent
                  ? "bg-success text-background"
                  : "bg-accent text-white"
            )}
            style={{
              left: pos.x - scaledSize / 2,
              top: pos.y - scaledSize / 2,
              width: scaledSize,
              height: scaledSize,
              fontSize: scaledSize * 0.45,
              opacity: isResolved ? 0.5 : 1,
            }}
            title={`${comment.author_name}: ${comment.content.slice(0, 60)}`}
          >
            {letter}
          </button>
        );
      })}
    </>
  );
}
