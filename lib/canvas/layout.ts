const SCREEN_GAP = 40;
const DEFAULT_SCREEN_WIDTH = 393;
const DEFAULT_SCREEN_HEIGHT = 852;
const COLUMNS = 4;
const MIN_LAYOUT_WIDTH = 300;

interface ScreenPosition {
  canvas_x: number;
  canvas_y: number;
  canvas_scale: number;
}

export function autoLayoutPosition(
  existingCount: number,
  width = DEFAULT_SCREEN_WIDTH,
  height = DEFAULT_SCREEN_HEIGHT
): ScreenPosition {
  // Use at least MIN_LAYOUT_WIDTH for column spacing so narrow assets don't stack
  const effectiveWidth = Math.max(width, MIN_LAYOUT_WIDTH);

  // For very tall screens (aspect ratio > 3:1), lay out in a single row
  const aspectRatio = height / Math.max(width, 1);
  const cols = aspectRatio > 3 ? Math.max(COLUMNS * 2, 8) : COLUMNS;

  const col = existingCount % cols;
  const row = Math.floor(existingCount / cols);

  return {
    canvas_x: col * (effectiveWidth + SCREEN_GAP),
    canvas_y: row * (height + SCREEN_GAP),
    canvas_scale: 1,
  };
}

export function fitToViewBounds(
  screens: Array<{
    canvas_x: number;
    canvas_y: number;
    width: number;
    height: number;
    canvas_scale?: number;
  }>,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number; scale: number } {
  if (screens.length === 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const s of screens) {
    const scale = s.canvas_scale ?? 1;
    minX = Math.min(minX, s.canvas_x);
    minY = Math.min(minY, s.canvas_y);
    maxX = Math.max(maxX, s.canvas_x + s.width * scale);
    maxY = Math.max(maxY, s.canvas_y + s.height * scale);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const padding = 80;

  const scaleX = (viewportWidth - padding * 2) / contentWidth;
  const scaleY = (viewportHeight - padding * 2) / contentHeight;

  // Don't zoom smaller than 15% — keeps content readable
  const scale = Math.max(Math.min(scaleX, scaleY, 1), 0.15);

  const centerX = minX + contentWidth / 2;
  const centerY = minY + contentHeight / 2;

  return {
    x: viewportWidth / 2 - centerX * scale,
    y: viewportHeight / 2 - centerY * scale,
    scale,
  };
}
