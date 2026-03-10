"use client";

import { useEffect, useRef } from "react";
import { X, Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import type { Screen } from "./board-canvas";

interface ScreenInspectorProps {
  screen: Screen;
  onClose: () => void;
}

export function ScreenInspector({ screen, onClose }: ScreenInspectorProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    // Focus the dialog on mount
    dialogRef.current?.focus();

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect screen: ${screen.name}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center focus:outline-none"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-[90vw] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {screen.name}
            </h2>
            <p className="text-xs text-text-tertiary font-mono">
              {screen.width} x {screen.height} &middot; {screen.source_type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {screen.image_url && (
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={screen.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download image"
                >
                  <Download className="w-4 h-4" />
                </a>
              </Button>
            )}
            {screen.html_url && (
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={screen.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open HTML in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close inspector"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="rounded-xl overflow-hidden border border-border bg-surface shadow-2xl">
          {screen.image_url ? (
            <Image
              src={screen.image_url}
              alt={screen.name}
              width={screen.width}
              height={screen.height}
              className="max-h-[80vh] w-auto object-contain"
              unoptimized
            />
          ) : screen.html_url ? (
            <iframe
              src={screen.html_url}
              title={screen.name}
              className="border-0"
              style={{ width: screen.width, height: screen.height }}
              sandbox=""
            />
          ) : (
            <div
              className="flex items-center justify-center bg-surface-elevated"
              style={{ width: screen.width, height: screen.height }}
            >
              <p className="text-text-tertiary">No preview available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
