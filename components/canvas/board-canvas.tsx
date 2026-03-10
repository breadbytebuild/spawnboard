"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScreenCard } from "./screen-card";
import { CanvasToolbar } from "./canvas-toolbar";
import { ScreenInspector } from "./screen-inspector";
import { CommentPins } from "./comment-pins";
import { CommentPanel } from "./comment-panel";
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

export interface Comment {
  id: string;
  pin_type: "screen" | "canvas";
  screen_id: string | null;
  pin_x: number;
  pin_y: number;
  author_type: "human" | "agent";
  author_name: string;
  content: string;
  parent_id: string | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface BoardCanvasProps {
  screens: Screen[];
  boardName: string;
  readOnly?: boolean;
  comments?: Comment[];
  onAddComment?: (comment: {
    pin_type: string;
    screen_id?: string;
    pin_x: number;
    pin_y: number;
    content: string;
  }) => void;
  onResolveComment?: (commentId: string, resolved: boolean) => void;
  onReplyComment?: (parentId: string, content: string) => void;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onScreenMove?: (screenId: string, x: number, y: number) => void;
}

interface ViewportRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface CommentInput {
  canvasX: number;
  canvasY: number;
  clientX: number;
  clientY: number;
  screenId?: string;
  pinX: number;
  pinY: number;
}

const VIEWPORT_BUFFER = 1.5;
const MAX_LIVE_IFRAMES = 12;
const IFRAME_MIN_ZOOM = 0.25;

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

function screenAtPoint(
  screens: Screen[],
  canvasX: number,
  canvasY: number
): Screen | undefined {
  for (let i = screens.length - 1; i >= 0; i--) {
    const s = screens[i];
    const sw = s.width * s.canvas_scale;
    const sh = s.height * s.canvas_scale;
    if (
      canvasX >= s.canvas_x &&
      canvasX <= s.canvas_x + sw &&
      canvasY >= s.canvas_y &&
      canvasY <= s.canvas_y + sh
    ) {
      return s;
    }
  }
  return undefined;
}

function CommentInputPopover({
  position,
  onSubmit,
  onCancel,
}: {
  position: { x: number; y: number };
  onSubmit: (content: string) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div
      className="absolute z-50 bg-surface border border-border rounded-xl shadow-2xl shadow-black/50 p-3 w-64"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={inputRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Add a comment..."
        rows={2}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors cursor-pointer px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-30 transition-colors cursor-pointer px-2 py-1"
        >
          Comment
        </button>
      </div>
    </div>
  );
}

export function BoardCanvas({
  screens,
  boardName,
  readOnly = false,
  comments = [],
  onAddComment,
  onResolveComment,
  onReplyComment,
  onEditComment,
  onDeleteComment,
  onScreenMove,
}: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  // Comment state
  const [commentMode, setCommentMode] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [commentInput, setCommentInput] = useState<CommentInput | null>(null);

  // Drag state
  const [draggingScreenId, setDraggingScreenId] = useState<string | null>(null);
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 });
  const dragDeltaRef = useRef({ dx: 0, dy: 0 });
  const dragStartRef = useRef({ canvasX: 0, canvasY: 0, screenX: 0, screenY: 0 });

  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

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

  // Pan handling
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

  // Screen drag handling
  useEffect(() => {
    if (!draggingScreenId) return;

    const onMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - offsetRef.current.x) / zoomRef.current;
      const canvasY = (e.clientY - rect.top - offsetRef.current.y) / zoomRef.current;
      const next = {
        dx: canvasX - dragStartRef.current.canvasX,
        dy: canvasY - dragStartRef.current.canvasY,
      };
      dragDeltaRef.current = next;
      setDragDelta(next);
    };

    const onMouseUp = () => {
      const { dx, dy } = dragDeltaRef.current;
      const finalX = dragStartRef.current.screenX + dx;
      const finalY = dragStartRef.current.screenY + dy;
      onScreenMove?.(draggingScreenId, Math.round(finalX), Math.round(finalY));
      setDraggingScreenId(null);
      setDragDelta({ dx: 0, dy: 0 });
      dragDeltaRef.current = { dx: 0, dy: 0 };
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingScreenId, onScreenMove]);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: (clientX - rect.left - offset.x) / zoom,
        y: (clientY - rect.top - offset.y) / zoom,
      };
    },
    [offset, zoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle-click or alt+click = pan
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        };
        return;
      }

      if (e.button !== 0) return;

      const canvasPos = clientToCanvas(e.clientX, e.clientY);

      // Comment mode: place a comment
      if (commentMode && onAddComment) {
        const target = screenAtPoint(screens, canvasPos.x, canvasPos.y);
        setCommentInput({
          canvasX: canvasPos.x,
          canvasY: canvasPos.y,
          clientX: e.clientX,
          clientY: e.clientY,
          screenId: target?.id,
          pinX: target ? canvasPos.x - target.canvas_x : canvasPos.x,
          pinY: target ? canvasPos.y - target.canvas_y : canvasPos.y,
        });
        return;
      }

      // Screen dragging (not readOnly, not commentMode)
      if (!readOnly && !commentMode && onScreenMove) {
        const target = screenAtPoint(screens, canvasPos.x, canvasPos.y);
        if (target) {
          e.preventDefault();
          setDraggingScreenId(target.id);
          dragStartRef.current = {
            canvasX: canvasPos.x,
            canvasY: canvasPos.y,
            screenX: target.canvas_x,
            screenY: target.canvas_y,
          };
          return;
        }
      }
    },
    [offset, commentMode, onAddComment, readOnly, onScreenMove, screens, clientToCanvas]
  );

  const handleCommentSubmit = useCallback(
    (content: string) => {
      if (!commentInput || !onAddComment) return;
      onAddComment({
        pin_type: commentInput.screenId ? "screen" : "canvas",
        screen_id: commentInput.screenId,
        pin_x: commentInput.pinX,
        pin_y: commentInput.pinY,
        content,
      });
      setCommentInput(null);
    },
    [commentInput, onAddComment]
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

  const replies = useMemo(() => {
    if (!selectedComment) return [];
    return comments.filter((c) => c.parent_id === selectedComment.id);
  }, [comments, selectedComment]);

  const canComment = !readOnly && !!onAddComment;
  const gridSize = 20;

  const cursorStyle = draggingScreenId
    ? "grabbing"
    : isPanning
      ? "grabbing"
      : commentMode
        ? "crosshair"
        : !readOnly && onScreenMove
          ? "default"
          : "default";

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: cursorStyle }}
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
          {screens.map((screen) => {
            const isDragging = draggingScreenId === screen.id;
            const displayScreen = isDragging
              ? {
                  ...screen,
                  canvas_x: screen.canvas_x + dragDelta.dx,
                  canvas_y: screen.canvas_y + dragDelta.dy,
                }
              : screen;

            return (
              <ScreenCard
                key={screen.id}
                screen={displayScreen}
                zoom={zoom}
                isLiveEligible={liveIframeIds.has(screen.id)}
                onClick={
                  !draggingScreenId && !commentMode
                    ? () => setSelectedScreen(screen)
                    : undefined
                }
              />
            );
          })}

          <CommentPins
            comments={comments}
            screens={screens}
            onPinClick={(c) => setSelectedComment(c)}
            zoom={zoom}
          />
        </div>

        {/* Comment input popover (positioned in client space) */}
        {commentInput && (
          <CommentInputPopover
            position={{ x: commentInput.clientX, y: commentInput.clientY }}
            onSubmit={handleCommentSubmit}
            onCancel={() => setCommentInput(null)}
          />
        )}
      </div>

      <CanvasToolbar
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        showGrid={showGrid}
        commentMode={commentMode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToView={handleFitToView}
        onZoomTo={handleZoomTo}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onToggleCommentMode={canComment ? () => setCommentMode(!commentMode) : undefined}
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
        {commentMode && (
          <span className="text-xs font-mono text-accent bg-accent-muted px-2 py-0.5 rounded">
            COMMENT MODE
          </span>
        )}
      </div>

      {selectedScreen && !commentMode && (
        <ScreenInspector
          screen={selectedScreen}
          onClose={() => setSelectedScreen(null)}
        />
      )}

      {selectedComment && (
        <CommentPanel
          comment={selectedComment}
          replies={replies}
          onClose={() => setSelectedComment(null)}
          onReply={
            onReplyComment
              ? (content) => onReplyComment(selectedComment.id, content)
              : undefined
          }
          onResolve={
            onResolveComment
              ? (resolved) => onResolveComment(selectedComment.id, resolved)
              : undefined
          }
          onEdit={onEditComment}
          onDelete={onDeleteComment}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
