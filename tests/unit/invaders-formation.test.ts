import { describe, expect, it } from 'vitest';
import {
  alive,
  clearBursts,
  createFormation,
  formationBottom,
  invaderRect,
  killInvader,
  lowestInColumn,
  occupiedColumns,
  stepFormation,
} from '../../src/lib/invaders/formation';
import {
  BEAT_START,
  BURST_MS,
  CELL_W,
  COLUMNS,
  COLUMN_PITCH,
  DESCENT,
  FORMATION_H,
  RANKS,
  RANK_PITCH,
  STEP_X,
} from '../../src/lib/invaders/rules';

const FIELD_W = 1042;

describe('createFormation', () => {
  it('builds 45 live invaders, five ranks of nine', () => {
    const f = createFormation(1, FIELD_W, 0);
    expect(f.invaders).toHaveLength(RANKS * COLUMNS);
    expect(alive(f)).toHaveLength(RANKS * COLUMNS);
    expect(new Set(f.invaders.map((i) => i.rank)).size).toBe(RANKS);
  });

  it('centres the block and starts it moving right', () => {
    const f = createFormation(1, FIELD_W, 0);
    expect(f.left).toBeCloseTo(180.45, 2);
    expect(f.dir).toBe(1);
  });

  it('schedules the first beat one beat out', () => {
    const f = createFormation(1, FIELD_W, 500);
    expect(f.nextBeatAt).toBe(500 + BEAT_START);
  });

  it('starts a later wave lower and with a lower beat floor', () => {
    const one = createFormation(1, FIELD_W, 0);
    const two = createFormation(2, FIELD_W, 0);
    expect(two.top).toBeCloseTo(one.top + RANK_PITCH, 5);
    expect(two.beatFloor).toBeLessThan(one.beatFloor);
  });
});

describe('invaderRect', () => {
  it('places an invader by its rank and column pitch', () => {
    const f = createFormation(1, FIELD_W, 0);
    const inv = f.invaders.find((i) => i.rank === 2 && i.col === 3)!;
    const box = invaderRect(f, inv);
    expect(box.x).toBeCloseTo(f.left + 3 * COLUMN_PITCH, 5);
    expect(box.y).toBeCloseTo(f.top + 2 * RANK_PITCH, 5);
    expect(box.w).toBeCloseTo(CELL_W, 5);
  });
});

describe('stepFormation', () => {
  it('does nothing before the beat is due', () => {
    const f = createFormation(1, FIELD_W, 0);
    const left = f.left;
    expect(stepFormation(f, BEAT_START - 1, FIELD_W)).toBe(false);
    expect(f.left).toBe(left);
  });

  it('jumps one glyph cell on the beat, with no tween', () => {
    const f = createFormation(1, FIELD_W, 0);
    const left = f.left;
    expect(stepFormation(f, BEAT_START, FIELD_W)).toBe(true);
    expect(f.left).toBeCloseTo(left + STEP_X, 5);
  });

  it('alternates the sprite frame on every step', () => {
    const f = createFormation(1, FIELD_W, 0);
    expect(f.frame).toBe('a');
    stepFormation(f, BEAT_START, FIELD_W);
    expect(f.frame).toBe('b');
    stepFormation(f, BEAT_START * 2, FIELD_W);
    expect(f.frame).toBe('a');
  });

  it('drops 16px and reverses on touching a wall, and does not also move', () => {
    const f = createFormation(1, FIELD_W, 0);
    // Park the block one step short of the right wall.
    f.left = FIELD_W - (COLUMNS - 1) * COLUMN_PITCH - CELL_W;
    const top = f.top;
    const left = f.left;

    stepFormation(f, BEAT_START, FIELD_W);

    expect(f.dir).toBe(-1);
    expect(f.top).toBeCloseTo(top + DESCENT, 5);
    expect(f.left).toBeCloseTo(left, 5);
  });

  it('measures the wall against living columns, not the original nine', () => {
    // With the right three columns dead the block can travel further before it
    // turns. Reading the wall off the starting width would turn it early and
    // leave a visible gap at the edge.
    const f = createFormation(1, FIELD_W, 0);
    for (const inv of f.invaders) if (inv.col >= COLUMNS - 3) inv.alive = false;
    f.left = FIELD_W - (COLUMNS - 1) * COLUMN_PITCH - CELL_W;
    const top = f.top;

    stepFormation(f, BEAT_START, FIELD_W);

    expect(f.dir).toBe(1);
    expect(f.top).toBe(top);
  });

  it('shortens the beat as invaders die, down to the floor', () => {
    const f = createFormation(1, FIELD_W, 0);
    stepFormation(f, BEAT_START, FIELD_W);
    const firstGap = f.nextBeatAt - BEAT_START;

    for (const inv of f.invaders.slice(0, 10)) killInvader(f, inv, 0);
    stepFormation(f, f.nextBeatAt, FIELD_W);
    const laterGap = f.nextBeatAt - (BEAT_START + firstGap);

    expect(laterGap).toBeLessThan(firstGap);
    expect(laterGap).toBeGreaterThanOrEqual(f.beatFloor);
  });
});

describe('killInvader', () => {
  it('scores the rank and starts the burst', () => {
    const f = createFormation(1, FIELD_W, 0);
    const top = f.invaders.find((i) => i.rank === 0)!;
    expect(killInvader(f, top, 1000)).toBe(30);
    expect(top.alive).toBe(false);
    expect(top.burstUntil).toBe(1000 + BURST_MS);
    expect(f.kills).toBe(1);
  });

  it('scores 20 for the middle ranks and 10 for the bottom two', () => {
    const f = createFormation(1, FIELD_W, 0);
    expect(killInvader(f, f.invaders.find((i) => i.rank === 1)!, 0)).toBe(20);
    expect(killInvader(f, f.invaders.find((i) => i.rank === 2)!, 0)).toBe(20);
    expect(killInvader(f, f.invaders.find((i) => i.rank === 3)!, 0)).toBe(10);
    expect(killInvader(f, f.invaders.find((i) => i.rank === 4)!, 0)).toBe(10);
  });

  it('drops the invader out of the living set', () => {
    const f = createFormation(1, FIELD_W, 0);
    killInvader(f, f.invaders[0], 0);
    expect(alive(f)).toHaveLength(RANKS * COLUMNS - 1);
  });
});

describe('clearBursts', () => {
  it('leaves the burst up for 110ms and then takes it down', () => {
    const f = createFormation(1, FIELD_W, 0);
    const inv = f.invaders[0];
    killInvader(f, inv, 1000);

    clearBursts(f, 1000 + BURST_MS - 1);
    expect(inv.burstUntil).toBe(1000 + BURST_MS);

    clearBursts(f, 1000 + BURST_MS);
    expect(inv.burstUntil).toBe(0);
  });
});

describe('picking a column to bomb', () => {
  it('lists only columns that still hold something', () => {
    const f = createFormation(1, FIELD_W, 0);
    for (const inv of f.invaders) if (inv.col === 4) inv.alive = false;
    expect(occupiedColumns(f)).not.toContain(4);
    expect(occupiedColumns(f)).toHaveLength(COLUMNS - 1);
  });

  it('finds the lowest living invader in a column', () => {
    const f = createFormation(1, FIELD_W, 0);
    expect(lowestInColumn(f, 2)!.rank).toBe(RANKS - 1);

    for (const inv of f.invaders) if (inv.col === 2 && inv.rank >= 3) inv.alive = false;
    expect(lowestInColumn(f, 2)!.rank).toBe(2);
  });

  it('returns null for an empty column', () => {
    const f = createFormation(1, FIELD_W, 0);
    for (const inv of f.invaders) if (inv.col === 0) inv.alive = false;
    expect(lowestInColumn(f, 0)).toBeNull();
  });
});

describe('formationBottom', () => {
  it('is the bottom edge of the lowest living rank', () => {
    const f = createFormation(1, FIELD_W, 0);
    expect(formationBottom(f)).toBeCloseTo(f.top + FORMATION_H, 5);
  });

  it('rises as the bottom ranks are cleared', () => {
    const f = createFormation(1, FIELD_W, 0);
    for (const inv of f.invaders) if (inv.rank === RANKS - 1) inv.alive = false;
    expect(formationBottom(f)).toBeCloseTo(f.top + FORMATION_H - RANK_PITCH, 5);
  });
});
