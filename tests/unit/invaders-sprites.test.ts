import { describe, expect, it } from 'vitest';
import {
  BUNKER,
  BURST,
  CRAB,
  OCTOPUS,
  PLAYER,
  RANK_INK,
  RANK_SPRITE,
  SPRITE_COLS,
  SQUID,
  gridCells,
  type Grid,
} from '../../src/lib/invaders/sprites';

const ALL: Record<string, Grid> = {
  'squid frame a': SQUID.a,
  'squid frame b': SQUID.b,
  'crab frame a': CRAB.a,
  'crab frame b': CRAB.b,
  'octopus frame a': OCTOPUS.a,
  'octopus frame b': OCTOPUS.b,
  burst: BURST,
  player: PLAYER,
  bunker: BUNKER,
};

describe('every grid', () => {
  for (const [name, grid] of Object.entries(ALL)) {
    it(`${name} is ${SPRITE_COLS} cells wide on every row`, () => {
      for (const row of grid) expect(row.length).toBe(SPRITE_COLS);
    });

    it(`${name} is built only from a full block and a space`, () => {
      const chars = new Set(grid.join(''));
      expect([...chars].sort()).toEqual([' ', '█']);
    });

    it(`${name} has at least one lit cell on every row`, () => {
      for (const row of grid) expect(row).toContain('█');
    });
  }
});

describe('heights', () => {
  it('invaders and the burst are 5 rows', () => {
    expect(SQUID.a).toHaveLength(5);
    expect(CRAB.a).toHaveLength(5);
    expect(OCTOPUS.a).toHaveLength(5);
    expect(BURST).toHaveLength(5);
  });

  it('the player and the bunker are 4 rows', () => {
    expect(PLAYER).toHaveLength(4);
    expect(BUNKER).toHaveLength(4);
  });
});

describe('frame b differs from frame a', () => {
  // The beat is only legible because the sprite changes on every step. A pair
  // that drifted into being identical would still render, and nothing else in
  // the suite would notice.
  it('on all three ranks', () => {
    expect(SQUID.b).not.toEqual(SQUID.a);
    expect(CRAB.b).not.toEqual(CRAB.a);
    expect(OCTOPUS.b).not.toEqual(OCTOPUS.a);
  });
});

describe('rank tables', () => {
  it('map five ranks to three sprites, by score band', () => {
    expect(RANK_SPRITE).toEqual([SQUID, CRAB, CRAB, OCTOPUS, OCTOPUS]);
  });

  it('rank the invaders in ink steps, never in colour', () => {
    expect(RANK_INK).toEqual([
      '--color-ink-muted',
      '--color-ink-secondary',
      '--color-ink-secondary',
      '--color-ink-body',
      '--color-ink-body',
    ]);
  });
});

describe('gridCells', () => {
  it('turns a grid into a row major boolean matrix', () => {
    expect(gridCells([' █ ', '███'])).toEqual([
      [false, true, false],
      [true, true, true],
    ]);
  });

  it('counts the bunker at 23 lit cells', () => {
    const lit = gridCells(BUNKER).flat().filter(Boolean).length;
    expect(lit).toBe(23);
  });
});
