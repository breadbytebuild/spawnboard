export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  scale: number
): { x: number; y: number } {
  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  offsetX: number,
  offsetY: number,
  scale: number
): { x: number; y: number } {
  return {
    x: canvasX * scale + offsetX,
    y: canvasY * scale + offsetY,
  };
}
