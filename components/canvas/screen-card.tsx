"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Screen } from "./board-canvas";

interface ScreenCardProps {
  screen: Screen;
  zoom: number;
  onClick?: () => void;
}

export function ScreenCard({ screen, zoom, onClick }: ScreenCardProps) {
  const showLabel = zoom > 0.3;
  const showBadges = zoom > 0.4;
  const hasCode = !!screen.source_html || !!screen.source_css;
  const hasContext = !!screen.context_md;

  return (
    <div
      className="absolute group"
      style={{
        left: screen.canvas_x,
        top: screen.canvas_y,
        width: screen.width * screen.canvas_scale,
        height: screen.height * screen.canvas_scale,
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full h-full rounded-lg overflow-hidden border border-border/50 bg-surface",
          "transition-shadow duration-200",
          "hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        )}
      >
        {screen.image_url ? (
          <Image
            src={screen.image_url}
            alt={screen.name}
            width={screen.width}
            height={screen.height}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-elevated">
            <div className="text-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mx-auto text-text-tertiary mb-2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p className="text-xs text-text-tertiary font-mono">
                {screen.source_type === "html" ? "HTML" : "No image"}
              </p>
            </div>
          </div>
        )}
      </button>

      {/* Label + asset badges */}
      {showLabel && (
        <div
          className="mt-2 transition-opacity duration-150"
          style={{ opacity: Math.min((zoom - 0.3) * 3, 1) }}
        >
          <p className="text-xs text-text-secondary truncate font-medium text-center">
            {screen.name}
          </p>

          {showBadges && (hasCode || hasContext) && (
            <div
              className="flex items-center justify-center gap-1 mt-1 transition-opacity duration-150"
              style={{ opacity: Math.min((zoom - 0.4) * 4, 1) }}
            >
              {hasCode && (
                <span className="text-[9px] font-mono bg-accent-muted text-accent px-1 py-0.5 rounded leading-none">
                  CODE
                </span>
              )}
              {hasContext && (
                <span className="text-[9px] font-mono bg-success/10 text-success px-1 py-0.5 rounded leading-none">
                  MD
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
