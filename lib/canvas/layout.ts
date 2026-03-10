const SCREEN_GAP = 40;
const DEFAULT_SCREEN_WIDTH = 393;
const DEFAULT_SCREEN_HEIGHT = 852;
const COLUMNS = 4;

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
  const col = existingCount % COLUMNS;
  const row = Math.floor(existingCount / COLUMNS);

  return {
    canvas_x: col * (width + SCREEN_GAP),
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
    minX = Math.min(minX, s.canvas_x);
    minY = Math.min(minY, s.canvas_y);
    maxX = Math.max(maxX, s.canvas_x + s.width);
    maxY = Math.max(maxY, s.canvas_y + s.height);
  }

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const padding = 80;

  const scaleX = (viewportWidth - padding * 2) / contentWidth;
  const scaleY = (viewportHeight - padding * 2) / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  const centerX = minX + contentWidth / 2;
  const centerY = minY + contentHeight / 2;

  return {
    x: viewportWidth / 2 - centerX * scale,
    y: viewportHeight / 2 - centerY * scale,
    scale,
  };
}
