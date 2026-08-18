/** Hit geometry. Pure, and unaware of what any box represents. */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** True when two boxes share area. Touching edges do not count. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * The grid cell a point lands in, or null when the point is outside the box.
 * Bunker erosion uses this to turn a bomb's position into a cell to clear.
 */
export function cellAt(
  box: Rect,
  cols: number,
  rows: number,
  px: number,
  py: number
): { col: number; row: number } | null {
  if (px < box.x || px >= box.x + box.w) return null;
  if (py < box.y || py >= box.y + box.h) return null;
  const col = Math.min(cols - 1, Math.floor(((px - box.x) / box.w) * cols));
  const row = Math.min(rows - 1, Math.floor(((py - box.y) / box.h) * rows));
  return { col, row };
}
