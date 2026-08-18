import { describe, expect, it } from 'vitest';
import {
  advanceBombs,
  advanceShot,
  bombRect,
  shotRect,
  type Bomb,
} from '../../src/lib/invaders/projectiles';
import { BOMB_H, BOMB_SPEED, FIELD_H, SHOT_H, SHOT_SPEED, SHOT_W } from '../../src/lib/invaders/rules';

describe('shotRect', () => {
  it('is 3 by 19 at the shot position', () => {
    expect(shotRect({ x: 100, y: 200 })).toEqual({ x: 100, y: 200, w: SHOT_W, h: SHOT_H });
  });
});

describe('advanceShot', () => {
  it('travels up at 620px a second', () => {
    // Measured over a tenth of a second and scaled. A full second of travel
    // needs a start above y 601, and the field is only 466 tall, so the shot
    // would already be gone and there would be nothing to measure.
    const moved = advanceShot({ x: 10, y: 400 }, 100);
    expect(moved!.y).toBeCloseTo(400 - SHOT_SPEED / 10, 5);
    expect(moved!.x).toBe(10);
  });

  it('scales with the frame time', () => {
    const moved = advanceShot({ x: 0, y: 400 }, 16);
    expect(moved!.y).toBeCloseTo(400 - SHOT_SPEED * 0.016, 5);
  });

  it('is gone once it leaves the top of the field', () => {
    expect(advanceShot({ x: 0, y: 5 }, 1000)).toBeNull();
  });

  it('is still there while any of it is on the field', () => {
    expect(advanceShot({ x: 0, y: SHOT_H - 1 }, 0)).not.toBeNull();
  });

  it('passes null straight through, so a frame with no shot is free', () => {
    expect(advanceShot(null, 16)).toBeNull();
  });
});

describe('advanceBombs', () => {
  const bombs: Bomb[] = [
    { x: 10, y: 100, rank: 0 },
    { x: 20, y: 200, rank: 4 },
  ];

  it('travels down at 210px a second and keeps the source rank', () => {
    const moved = advanceBombs(bombs, 1000);
    expect(moved[0].y).toBeCloseTo(100 + BOMB_SPEED, 5);
    expect(moved[0].rank).toBe(0);
    expect(moved[1].rank).toBe(4);
  });

  it('drops the ones that have left the bottom of the field', () => {
    const moved = advanceBombs([{ x: 0, y: FIELD_H - 1, rank: 0 }], 1000);
    expect(moved).toHaveLength(0);
  });

  it('does not mutate the array it was given', () => {
    const original = [{ x: 0, y: 0, rank: 0 }];
    advanceBombs(original, 1000);
    expect(original[0].y).toBe(0);
  });

  it('is empty in, empty out', () => {
    expect(advanceBombs([], 16)).toEqual([]);
  });
});

describe('bombRect', () => {
  it('is 3 by 15 at the bomb position', () => {
    expect(bombRect({ x: 5, y: 6, rank: 2 })).toEqual({ x: 5, y: 6, w: 3, h: BOMB_H });
  });
});
