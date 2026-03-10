"use client";

import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  showGrid: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  onZoomTo: (value: number) => void;
  onToggleGrid: () => void;
}

export function CanvasToolbar({
  zoom,
  minZoom,
  maxZoom,
  showGrid,
  onZoomIn,
  onZoomOut,
  onFitToView,
  onZoomTo,
  onToggleGrid,
}: CanvasToolbarProps) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/90 backdrop-blur-xl border border-border rounded-xl px-2 py-1.5 shadow-2xl shadow-black/40">
      <ToolbarButton
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        tooltip="Zoom out"
      >
        <ZoomOut className="w-4 h-4" />
      </ToolbarButton>

      <button
        type="button"
        onClick={() => onZoomTo(1)}
        className="px-2 py-1 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors min-w-[48px] text-center rounded-md hover:bg-surface-elevated cursor-pointer"
      >
        {zoomPercent}%
      </button>

      <ToolbarButton
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        tooltip="Zoom in"
      >
        <ZoomIn className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton onClick={onFitToView} tooltip="Fit to view">
        <Maximize className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={onToggleGrid}
        active={showGrid}
        tooltip="Toggle grid"
      >
        <Grid3X3 className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled = false,
  active = false,
  tooltip,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tooltip: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={cn(
        "p-2 rounded-lg transition-colors cursor-pointer",
        "text-text-secondary hover:text-text-primary hover:bg-surface-elevated",
        "disabled:opacity-30 disabled:pointer-events-none",
        active && "text-accent bg-accent-muted"
      )}
    >
      {children}
    </button>
  );
}
