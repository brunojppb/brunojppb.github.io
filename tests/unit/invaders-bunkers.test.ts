import { describe, expect, it } from 'vitest';
import {
  bunkerRect,
  bunkerRows,
  createBunkers,
  erode,
  isGone,
  litCells,
} from '../../src/lib/invaders/bunkers';
import { BUNKER_COUNT, BUNKER_GAP, BUNKER_H, BUNKER_TOP, CELL_W } from '../../src/lib/invaders/rules';

const FIELD_W = 1042;

describe('createBunkers', () => {
  it('makes four, each starting at 23 lit cells', () => {
    const bunkers = createBunkers(FIELD_W);
    expect(bunkers).toHaveLength(BUNKER_COUNT);
    for (const b of bunkers) expect(litCells(b)).toBe(23);
  });

  it('spaces them 96px apart and centres the group', () => {
    const bunkers = createBunkers(FIELD_W);
    expect(bunkers[1].x - bunkers[0].x).toBeCloseTo(CELL_W + BUNKER_GAP, 5);

    const groupLeft = bunkers[0].x;
    const groupRight = bunkers[BUNKER_COUNT - 1].x + CELL_W;
    expect(groupLeft).toBeCloseTo(FIELD_W - groupRight, 5);
  });

  it('puts them at y 352', () => {
    const box = bunkerRect(createBunkers(FIELD_W)[0]);
    expect(box.y).toBe(BUNKER_TOP);
    expect(box.h).toBeCloseTo(BUNKER_H, 5);
  });

  it('gives each bunker its own cells, not a shared reference', () => {
    const bunkers = createBunkers(FIELD_W);
    erode(bunkers[0], bunkers[0].x + CELL_W / 2, BUNKER_TOP + 1);
    expect(litCells(bunkers[1])).toBe(23);
  });
});

describe('erode', () => {
  it('clears the block of nine around the cell it hit', () => {
    const b = createBunkers(FIELD_W)[0];
    // The middle of row 1. Rows 0 to 2 are solid across columns 2 to 4.
    const px = b.x + CELL_W / 2;
    const py = BUNKER_TOP + BUNKER_H * (1.5 / 4);

    expect(erode(b, px, py)).toBe(true);
    expect(litCells(b)).toBe(23 - 9);
  });

  it('clips the block at an edge instead of wrapping', () => {
    const b = createBunkers(FIELD_W)[0];
    // Column 0 of row 1. The block's left column is off the grid, and row 0
    // column 0 is already empty in the pristine sprite, so five lit cells go.
    const px = b.x + CELL_W * 0.1;
    const py = BUNKER_TOP + BUNKER_H * (1.5 / 4);

    expect(erode(b, px, py)).toBe(true);
    expect(litCells(b)).toBe(23 - 5);
  });

  it('does not count a second shot into the hole it already made', () => {
    const b = createBunkers(FIELD_W)[0];
    const px = b.x + CELL_W / 2;
    const py = BUNKER_TOP + BUNKER_H * (1.5 / 4);

    expect(erode(b, px, py)).toBe(true);
    expect(erode(b, px, py)).toBe(false);
    expect(litCells(b)).toBe(23 - 9);
  });

  it('reports no hit outside the sprite box', () => {
    const b = createBunkers(FIELD_W)[0];
    expect(erode(b, b.x - 5, BUNKER_TOP + 1)).toBe(false);
    expect(erode(b, b.x + 1, BUNKER_TOP - 5)).toBe(false);
    expect(litCells(b)).toBe(23);
  });

  it('reports no hit on a cell that is already clear, so a shot goes through', () => {
    const b = createBunkers(FIELD_W)[0];
    // Row 0 column 0 is empty in the pristine sprite.
    const px = b.x + 1;
    const py = BUNKER_TOP + 1;
    expect(erode(b, px, py)).toBe(false);
    expect(litCells(b)).toBe(23);
  });

  it('kills a bunker in five hits', () => {
    const b = createBunkers(FIELD_W)[0];
    // Three across the middle, then the two legs. The order matters less than
    // the spread: firing at one spot cannot finish a bunker, because every shot
    // after the first passes through the hole.
    const points: [number, number][] = [
      [0.5, 1.5],
      [0.1, 1.5],
      [0.9, 1.5],
      [0.1, 3.5],
      [0.9, 3.5],
    ];
    let hits = 0;
    for (const [fx, fy] of points) {
      if (isGone(b)) break;
      if (erode(b, b.x + CELL_W * fx, BUNKER_TOP + BUNKER_H * (fy / 4))) hits += 1;
    }
    expect(hits).toBe(5);
    expect(isGone(b)).toBe(true);
  });
});

describe('bunkerRows', () => {
  it('renders the pristine sprite back out', () => {
    const b = createBunkers(FIELD_W)[0];
    expect(bunkerRows(b)).toEqual([' █████ ', '███████', '███████', '██   ██']);
  });

  it('shows erosion as spaces, so the row stays seven cells wide', () => {
    const b = createBunkers(FIELD_W)[0];
    erode(b, b.x + CELL_W / 2, BUNKER_TOP + BUNKER_H * (1.5 / 4));
    const rows = bunkerRows(b);
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.length).toBe(7);
    expect(rows.join('')).toContain(' ');
  });
});

describe('isGone', () => {
  it('is false while any cell is lit', () => {
    expect(isGone(createBunkers(FIELD_W)[0])).toBe(false);
  });

  it('is true once every cell is clear', () => {
    const b = createBunkers(FIELD_W)[0];
    b.cells = b.cells.map((row) => row.map(() => false));
    expect(isGone(b)).toBe(true);
  });
});
