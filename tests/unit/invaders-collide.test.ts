import { describe, expect, it } from 'vitest';
import { cellAt, overlaps, type Rect } from '../../src/lib/invaders/collide';

const box: Rect = { x: 100, y: 200, w: 70, h: 50 };

describe('overlaps', () => {
  it('is true when two boxes share area', () => {
    expect(overlaps(box, { x: 160, y: 240, w: 20, h: 20 })).toBe(true);
  });

  it('is false when they only touch on an edge', () => {
    // Touching is not a hit. A shot resting exactly on an invader's top edge
    // has not reached it yet, and counting it would kill on the frame before
    // the sprites visibly meet.
    expect(overlaps(box, { x: 170, y: 200, w: 10, h: 10 })).toBe(false);
    expect(overlaps(box, { x: 100, y: 250, w: 10, h: 10 })).toBe(false);
  });

  it('is false when they are apart', () => {
    expect(overlaps(box, { x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('is true when one box contains the other', () => {
    expect(overlaps(box, { x: 110, y: 210, w: 5, h: 5 })).toBe(true);
  });
});

describe('cellAt', () => {
  it('maps a point to its grid cell', () => {
    // 70 wide over 7 columns is 10px a column. 50 tall over 5 rows is 10px a row.
    expect(cellAt(box, 7, 5, 105, 205)).toEqual({ col: 0, row: 0 });
    expect(cellAt(box, 7, 5, 165, 245)).toEqual({ col: 6, row: 4 });
    expect(cellAt(box, 7, 5, 135, 225)).toEqual({ col: 3, row: 2 });
  });

  it('returns null outside the box', () => {
    expect(cellAt(box, 7, 5, 99, 205)).toBeNull();
    expect(cellAt(box, 7, 5, 105, 199)).toBeNull();
    expect(cellAt(box, 7, 5, 170, 205)).toBeNull();
    expect(cellAt(box, 7, 5, 105, 250)).toBeNull();
  });

  it('keeps a point just inside the right edge in the last cell', () => {
    const cell = cellAt(box, 7, 5, 169.999, 249.999);
    expect(cell).toEqual({ col: 6, row: 4 });
  });

  it('clamps a column that the subtraction rounds past the last one', () => {
    // The real reason the clamp exists, and it needs these values rather than
    // round ones. `px - x` can round up to exactly `w` while `px < x + w`, which
    // makes the unclamped index equal `cols` and read off the end of a sprite
    // grid. No double between 100 and 170 reaches that case, so the test above
    // passes whether the clamp is there or not.
    const drift: Rect = { x: 104.86599972550059, y: 0, w: 387.3766972172531, h: 10 };
    const px = 492.24269694275364;

    expect(px).toBeLessThan(drift.x + drift.w);
    expect(Math.floor(((px - drift.x) / drift.w) * 32)).toBe(32);
    expect(cellAt(drift, 32, 5, px, 5)).toEqual({ col: 31, row: 2 });
  });
});
