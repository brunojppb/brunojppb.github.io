import { describe, expect, it } from 'vitest';
import { CELL_H, CELL_W, RANKS, SPRITE_COLS } from '../../src/lib/invaders/rules';
import { arriveAt, blockAt, fadeAt, veilAt } from '../../src/lib/invaders/transition';

describe('blockAt', () => {
  it('hits every keyframe the handoff names', () => {
    expect(blockAt(0)).toBeCloseTo(1, 5);
    expect(blockAt(160)).toBeCloseTo(6, 5);
    expect(blockAt(380)).toBeCloseTo(20, 5);
    expect(blockAt(520)).toBeCloseTo(40, 5);
    expect(blockAt(650)).toBeCloseTo(24, 5);
    expect(blockAt(720)).toBeCloseTo(24, 5);
  });

  it('falls in resolution up to 520ms', () => {
    let previous = blockAt(0);
    for (let t = 20; t <= 520; t += 20) {
      const now = blockAt(t);
      expect(now).toBeGreaterThan(previous);
      previous = now;
    }
  });

  // The reversal is the idea. A fade would leave this monotonic all the way to
  // 650ms, and the invaders would never appear to come out of the page's pixels.
  it('climbs back from 520ms rather than fading', () => {
    let previous = blockAt(520);
    for (let t = 540; t <= 650; t += 10) {
      const now = blockAt(t);
      expect(now).toBeLessThan(previous);
      previous = now;
    }
  });

  // The game raster carries the hand-over and it cannot be registered against the
  // DOM below about 20px, so the last 70ms cross-fades at a held block instead of
  // resolving. Resolving it would double every line in the window.
  it('holds its block across the hand-over rather than resolving', () => {
    for (let t = 650; t <= 720; t += 10) expect(blockAt(t)).toBeCloseTo(24, 5);
  });

  it('never goes under one pixel', () => {
    for (let t = 0; t <= 800; t += 10) expect(blockAt(t)).toBeGreaterThanOrEqual(1);
  });

  // A block the size of a sprite cell redraws the invaders almost exactly, and
  // the hand-over frame is the last one at full opacity. At block 8 that frame
  // read as a formation on a bare field, which is a screen the game never shows:
  // the title panel covers the field. Keep the hand-over well clear of the cell.
  it('hands over at a block far coarser than a sprite cell', () => {
    const cell = Math.max(CELL_W / SPRITE_COLS, CELL_H / RANKS);
    expect(blockAt(650)).toBeGreaterThan(cell * 1.5);
  });
});

describe('veilAt', () => {
  it('is off until 380ms', () => {
    expect(veilAt(0)).toBe(0);
    expect(veilAt(379)).toBe(0);
  });

  it('builds to 70 percent by 520ms', () => {
    expect(veilAt(450)).toBeGreaterThan(0);
    expect(veilAt(450)).toBeLessThan(0.7);
    expect(veilAt(520)).toBeCloseTo(0.7, 5);
  });

  // The handoff builds the veil and never takes it off. It has to come off, or
  // the invaders resolve under a 70 percent wash of the field colour and are
  // never seen.
  it('retreats to nothing by 650ms, so the invaders can resolve', () => {
    expect(veilAt(585)).toBeCloseTo(0.35, 5);
    expect(veilAt(650)).toBe(0);
    expect(veilAt(720)).toBe(0);
  });
});

describe('fadeAt', () => {
  it('holds the canvas opaque up to the hand-over', () => {
    expect(fadeAt(0)).toBe(1);
    expect(fadeAt(520)).toBe(1);
    expect(fadeAt(650)).toBe(1);
  });

  // The handoff hands the frame over between 650ms and 720ms. A cut instead of a
  // ramp shows one fully opaque frame at block 8, and block 8 is one sprite cell
  // wide, so that frame is a legible formation the game itself never draws.
  it('ramps to nothing across the 70ms hand-over', () => {
    expect(fadeAt(685)).toBeCloseTo(0.5, 5);
    expect(fadeAt(720)).toBe(0);
  });

  // The exit reads the same curve backwards, so a monotonic ramp here is what
  // gives the exit its fade in. Without it the exit opens on a sharp formation.
  it('falls the whole way, which is what fades the exit in', () => {
    let previous = fadeAt(650);
    for (let t = 660; t <= 720; t += 10) {
      const now = fadeAt(t);
      expect(now).toBeLessThan(previous);
      previous = now;
    }
  });

  it('never leaves the 0 to 1 range', () => {
    for (let t = 0; t <= 800; t += 10) {
      expect(fadeAt(t)).toBeGreaterThanOrEqual(0);
      expect(fadeAt(t)).toBeLessThanOrEqual(1);
    }
  });
});

describe('arriveAt', () => {
  it('is pure formation until the block curve turns at 520ms', () => {
    expect(arriveAt(0)).toBe(0);
    expect(arriveAt(380)).toBe(0);
    expect(arriveAt(520)).toBe(0);
  });

  // The formation is hand drawn, so it can only approximate the screen the reader
  // gets. On the title screen the panel covers the field, so the real screen has
  // no invaders on it at all. Crossing to the raster before the blocks get fine
  // enough to read is what keeps the hand-over off a screen the game never shows.
  it('is the real game screen by the hand-over', () => {
    expect(arriveAt(650)).toBe(1);
    expect(arriveAt(720)).toBe(1);
  });

  it('crosses over under the retreating veil, so the swap is never a cut', () => {
    expect(arriveAt(585)).toBeCloseTo(0.5, 5);
    let previous = arriveAt(520);
    for (let t = 530; t <= 650; t += 10) {
      const now = arriveAt(t);
      expect(now).toBeGreaterThan(previous);
      previous = now;
    }
  });

  it('never leaves the 0 to 1 range', () => {
    for (let t = 0; t <= 800; t += 10) {
      expect(arriveAt(t)).toBeGreaterThanOrEqual(0);
      expect(arriveAt(t)).toBeLessThanOrEqual(1);
    }
  });
});
