"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScreenCard } from "./screen-card";
import { CanvasToolbar } from "./canvas-toolbar";
import { ScreenInspector } from "./screen-inspector";
import { MIN_ZOOM, MAX_ZOOM, clampZoom } from "@/lib/canvas/viewport";
import { fitToViewBounds } from "@/lib/canvas/layout";

export interface Screen {
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
}

interface BoardCanvasProps {
  screens: Screen[];
  boardName: string;
  readOnly?: boolean;
}

interface ViewportRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const VIEWPORT_BUFFER = 1.5;
const MAX_LIVE_IFRAMES = 12;
const IFRAME_MIN_ZOOM = 0.25; // Below this zoom, no iframes at all

function distanceToViewportCenter(
  screen: Screen,
  centerX: number,
  centerY: number
): number {
  const sx = screen.canvas_x + (screen.width * screen.canvas_scale) / 2;
  const sy = screen.canvas_y + (screen.height * screen.canvas_scale) / 2;
  return Math.hypot(sx - centerX, sy - centerY);
}

function isScreenInViewport(
  screen: Screen,
  viewport: ViewportRect
): boolean {
  const sw = screen.width * screen.canvas_scale;
  const sh = screen.height * screen.canvas_scale;
  return (
    screen.canvas_x + sw > viewport.left &&
    screen.canvas_x < viewport.right &&
    screen.canvas_y + sh > viewport.top &&
    screen.canvas_y < viewport.bottom
  );
}

export function BoardCanvas({
  screens,
  boardName,
  readOnly = false,
}: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Compute the visible canvas rect (in canvas coordinates) with a buffer
  const viewportRect = useMemo((): ViewportRect => {
    const el = containerRef.current;
    if (!el) return { left: -1e6, top: -1e6, right: 1e6, bottom: 1e6 };

    const w = el.clientWidth;
    const h = el.clientHeight;
    const bufferW = w * VIEWPORT_BUFFER;
    const bufferH = h * VIEWPORT_BUFFER;

    return {
      left: (-offset.x - bufferW) / zoom,
      top: (-offset.y - bufferH) / zoom,
      right: (-offset.x + w + bufferW) / zoom,
      bottom: (-offset.y + h + bufferH) / zoom,
    };
  }, [offset, zoom]);

  useEffect(() => {
    if (screens.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const fit = fitToViewBounds(screens, rect.width, rect.height);
      setOffset({ x: fit.x, y: fit.y });
      setZoom(fit.scale);
    }
  }, [screens.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentZoom = zoomRef.current;
      const currentOffset = offsetRef.current;

      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = -e.deltaY * 0.002;
        const newZoom = clampZoom(currentZoom + delta);
        const ratio = newZoom / currentZoom;

        setOffset({
          x: mouseX - (mouseX - currentOffset.x) * ratio,
          y: mouseY - (mouseY - currentOffset.y) * ratio,
        });
        setZoom(newZoom);
      } else {
        setOffset({
          x: currentOffset.x - e.deltaX,
          y: currentOffset.y - e.deltaY,
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!isPanning) return;

    const onMouseMove = (e: MouseEvent) => {
      setOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    };

    const onMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isPanning]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        };
      }
    },
    [offset]
  );

  const handleZoomIn = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nz = clampZoom(zoom + 0.15);
    const r = nz / zoom;
    setOffset({ x: cx - (cx - offset.x) * r, y: cy - (cy - offset.y) * r });
    setZoom(nz);
  }, [zoom, offset]);

  const handleZoomOut = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nz = clampZoom(zoom - 0.15);
    const r = nz / zoom;
    setOffset({ x: cx - (cx - offset.x) * r, y: cy - (cy - offset.y) * r });
    setZoom(nz);
  }, [zoom, offset]);

  const handleFitToView = useCallback(() => {
    if (!containerRef.current || screens.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fit = fitToViewBounds(screens, rect.width, rect.height);
    setOffset({ x: fit.x, y: fit.y });
    setZoom(fit.scale);
  }, [screens]);

  const handleZoomTo = useCallback(
    (value: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const nz = clampZoom(value);
      const r = nz / zoom;
      setOffset({ x: cx - (cx - offset.x) * r, y: cy - (cy - offset.y) * r });
      setZoom(nz);
    },
    [zoom, offset]
  );

  // Compute which screens are eligible for live iframe rendering.
  // Hard cap of MAX_LIVE_IFRAMES, prioritized by distance to viewport center.
  // Below IFRAME_MIN_ZOOM, no iframes render at all (everything is image/placeholder).
  const liveIframeIds = useMemo(() => {
    if (zoom < IFRAME_MIN_ZOOM) return new Set<string>();

    const vpCenterX = (viewportRect.left + viewportRect.right) / 2;
    const vpCenterY = (viewportRect.top + viewportRect.bottom) / 2;

    const candidates = screens
      .filter(
        (s) => (!!s.source_html || !!s.html_url) && isScreenInViewport(s, viewportRect)
      )
      .map((s) => ({
        id: s.id,
        dist: distanceToViewportCenter(s, vpCenterX, vpCenterY),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, MAX_LIVE_IFRAMES);

    return new Set(candidates.map((c) => c.id));
  }, [screens, viewportRect, zoom]);

  const gridSize = 20;

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: isPanning ? "grabbing" : "default" }}
        onMouseDown={handleMouseDown}
      >
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--color-border-subtle) 1px, transparent 1px)",
              backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
              backgroundPosition: `${offset.x % (gridSize * zoom)}px ${offset.y % (gridSize * zoom)}px`,
              opacity: Math.min(zoom, 1),
            }}
          />
        )}

        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            willChange: "transform",
          }}
        >
          {screens.map((screen) => (
            <ScreenCard
              key={screen.id}
              screen={screen}
              zoom={zoom}
              isLiveEligible={liveIframeIds.has(screen.id)}
              onClick={() => setSelectedScreen(screen)}
            />
          ))}
        </div>
      </div>

      <CanvasToolbar
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        showGrid={showGrid}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToView={handleFitToView}
        onZoomTo={handleZoomTo}
        onToggleGrid={() => setShowGrid(!showGrid)}
      />

      <div className="absolute top-4 left-4 flex items-center gap-3">
        <h1 className="text-sm font-medium text-text-secondary">
          {boardName}
        </h1>
        {!readOnly && (
          <span className="text-xs text-text-tertiary font-mono">
            {screens.length} screen{screens.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {selectedScreen && (
        <ScreenInspector
          screen={selectedScreen}
          onClose={() => setSelectedScreen(null)}
        />
      )}
    </div>
  );
}
