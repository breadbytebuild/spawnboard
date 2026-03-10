"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Use refs for values needed in native event handlers to avoid stale closures
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Fit to view on initial load
  useEffect(() => {
    if (screens.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const fit = fitToViewBounds(screens, rect.width, rect.height);
      setOffset({ x: fit.x, y: fit.y });
      setZoom(fit.scale);
    }
  }, [screens.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native wheel handler with { passive: false } to allow preventDefault
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

  // Window-level mouse handlers for pan (prevents stuck state when cursor leaves)
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
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newZoom = clampZoom(zoom + 0.15);
    const ratio = newZoom / zoom;
    setOffset({
      x: centerX - (centerX - offset.x) * ratio,
      y: centerY - (centerY - offset.y) * ratio,
    });
    setZoom(newZoom);
  }, [zoom, offset]);

  const handleZoomOut = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const newZoom = clampZoom(zoom - 0.15);
    const ratio = newZoom / zoom;
    setOffset({
      x: centerX - (centerX - offset.x) * ratio,
      y: centerY - (centerY - offset.y) * ratio,
    });
    setZoom(newZoom);
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
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const newZoom = clampZoom(value);
      const ratio = newZoom / zoom;
      setOffset({
        x: centerX - (centerX - offset.x) * ratio,
        y: centerY - (centerY - offset.y) * ratio,
      });
      setZoom(newZoom);
    },
    [zoom, offset]
  );

  const gridSize = 20;

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: isPanning ? "grabbing" : "default" }}
        onMouseDown={handleMouseDown}
      >
        {/* Grid dots */}
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

        {/* Transform layer */}
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
              onClick={() => setSelectedScreen(screen)}
            />
          ))}
        </div>
      </div>

      {/* Toolbar */}
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

      {/* Board name */}
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

      {/* Screen inspector */}
      {selectedScreen && (
        <ScreenInspector
          screen={selectedScreen}
          onClose={() => setSelectedScreen(null)}
        />
      )}
    </div>
  );
}
