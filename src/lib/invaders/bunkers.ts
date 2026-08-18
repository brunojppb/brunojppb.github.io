import { cellAt, type Rect } from './collide';
import { BUNKER, SPRITE_COLS, gridCells } from './sprites';
import {
  BUNKERS_W,
  BUNKER_COUNT,
  BUNKER_GAP,
  BUNKER_H,
  BUNKER_ROWS,
  BUNKER_TOP,
  CELL_W,
} from './rules';

export interface Bunker {
  x: number;
  /** Row major, `BUNKER_ROWS` by `SPRITE_COLS`. Erosion clears cells here. */
  cells: boolean[][];
}

/** Four bunkers, 96px apart, as one group centred in the field. */
export function createBunkers(fieldW: number): Bunker[] {
  const left = (fieldW - BUNKERS_W) / 2;
  return Array.from({ length: BUNKER_COUNT }, (_unused, i) => ({
    x: left + i * (CELL_W + BUNKER_GAP),
    cells: gridCells(BUNKER),
  }));
}

export function bunkerRect(b: Bunker): Rect {
  return { x: b.x, y: BUNKER_TOP, w: CELL_W, h: BUNKER_H };
}

/**
 * Clears the 3x3 block of cells around the one a projectile landed in, and
 * reports whether anything was there to hit.
 *
 * A projectile that reaches an already cleared cell is not a hit: it carries on
 * through the gap. That is what makes a hole in a bunker worth shooting.
 */
export function erode(b: Bunker, px: number, py: number): boolean {
  const cell = cellAt(bunkerRect(b), SPRITE_COLS, BUNKER_ROWS, px, py);
  if (!cell) return false;
  if (!b.cells[cell.row][cell.col]) return false;

  // A 3x3 block, clipped to the grid. The design asks for four states and then
  // gone, and a smaller mask cannot get there: clearing only the cell and its
  // four neighbours leaves a checkerboard of six cells that no aim can finish.
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const row = cell.row + dr;
      const col = cell.col + dc;
      if (row < 0 || row >= BUNKER_ROWS || col < 0 || col >= SPRITE_COLS) continue;
      b.cells[row][col] = false;
    }
  }
  return true;
}

export function isGone(b: Bunker): boolean {
  return b.cells.every((row) => row.every((lit) => !lit));
}

export function litCells(b: Bunker): number {
  return b.cells.flat().filter(Boolean).length;
}

/** The bunker as sprite rows, for `view.ts` to write into its `<pre>`. */
export function bunkerRows(b: Bunker): string[] {
  return b.cells.map((row) => row.map((lit) => (lit ? '█' : ' ')).join(''));
}
