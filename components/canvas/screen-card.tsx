"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { Screen } from "./board-canvas";

interface ScreenCardProps {
  screen: Screen;
  zoom: number;
  isLiveEligible: boolean;
  onClick?: () => void;
}

/**
 * Render priority (decided by parent canvas with hard cap):
 * 1. If isLiveEligible → live sandboxed iframe (CSS injected via srcDoc)
 * 2. If has image_url → static image
 * 3. Placeholder
 *
 * The parent limits isLiveEligible to max 12 screens, closest to viewport
 * center, and disables all iframes below 25% zoom.
 */
export function ScreenCard({
  screen,
  zoom,
  isLiveEligible,
  onClick,
}: ScreenCardProps) {
  const showLabel = zoom > 0.3;
  const showBadges = zoom > 0.4;
  const hasCode = !!screen.source_html || !!screen.source_css;
  const hasContext = !!screen.context_md;

  const canRenderLiveSrcDoc = isLiveEligible && !!screen.source_html;
  const canRenderLiveUrl = isLiveEligible && !!screen.html_url;
  const hasImage = !!screen.image_url;

  // Priority: inline srcDoc iframe > hosted html_url iframe > image > placeholder
  const renderMode: "iframe-srcdoc" | "iframe-url" | "image" | "placeholder" =
    canRenderLiveSrcDoc
      ? "iframe-srcdoc"
      : canRenderLiveUrl
        ? "iframe-url"
        : hasImage
          ? "image"
          : !!screen.html_url
            ? "iframe-url" // even if not live-eligible, it's the only content
            : "placeholder";

  const iframeSrcDoc = useMemo(() => {
    if (!screen.source_html) return "";
    let html = screen.source_html;

    if (screen.source_css) {
      const styleTag = `<style>${screen.source_css}</style>`;
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${styleTag}</head>`);
      } else if (html.includes("<html")) {
        // No </head> — wrap with a proper head
        html = html.replace(/(<html[^>]*>)/, `$1<head>${styleTag}</head>`);
      } else {
        // Fragment — wrap entirely
        html = `<!DOCTYPE html><html><head>${styleTag}</head><body>${html}</body></html>`;
      }
    }

    return html;
  }, [screen.source_html, screen.source_css]);

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const isIframe = renderMode === "iframe-srcdoc" || renderMode === "iframe-url";

  useEffect(() => {
    if (!isIframe) setIframeLoaded(false);
  }, [isIframe]);

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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          "relative"
        )}
      >
        {renderMode === "iframe-srcdoc" && (
          <>
            {hasImage && (
              <Image
                src={screen.image_url!}
                alt={screen.name}
                width={screen.width}
                height={screen.height}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                  iframeLoaded ? "opacity-0" : "opacity-100"
                )}
                unoptimized
              />
            )}
            <iframe
              srcDoc={iframeSrcDoc}
              title={screen.name}
              className={cn(
                "w-full h-full border-0 pointer-events-none transition-opacity duration-300",
                iframeLoaded ? "opacity-100" : "opacity-0"
              )}
              sandbox=""
              loading="lazy"
              onLoad={() => setIframeLoaded(true)}
            />
          </>
        )}

        {renderMode === "iframe-url" && (
          <>
            {hasImage && (
              <Image
                src={screen.image_url!}
                alt={screen.name}
                width={screen.width}
                height={screen.height}
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
                  iframeLoaded ? "opacity-0" : "opacity-100"
                )}
                unoptimized
              />
            )}
            <iframe
              src={screen.html_url!}
              title={screen.name}
              className={cn(
                "w-full h-full border-0 pointer-events-none transition-opacity duration-300",
                iframeLoaded ? "opacity-100" : "opacity-0"
              )}
              sandbox=""
              loading="lazy"
              onLoad={() => setIframeLoaded(true)}
            />
          </>
        )}

        {renderMode === "image" && (
          <Image
            src={screen.image_url!}
            alt={screen.name}
            width={screen.width}
            height={screen.height}
            className="w-full h-full object-cover"
            unoptimized
          />
        )}

        {renderMode === "placeholder" && (
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
                {screen.source_html ? "HTML" : "No preview"}
              </p>
            </div>
          </div>
        )}

        {/* Live indicator dot */}
        {isIframe && iframeLoaded && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[8px] font-mono text-white/70">LIVE</span>
          </div>
        )}
      </button>

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
