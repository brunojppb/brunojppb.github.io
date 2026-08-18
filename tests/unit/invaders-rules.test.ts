import { describe, expect, it } from 'vitest';
import {
  BEAT_DECAY,
  BEAT_FLOOR,
  BEAT_START,
  CELL_H,
  CELL_W,
  COLUMNS,
  COLUMN_PITCH,
  FIELD_H,
  FORMATION_H,
  FORMATION_TOP,
  FORMATION_W,
  LIVES,
  MAX_BOMBS,
  PLAYER_H,
  PLAYER_TOP,
  RANKS,
  RANK_PITCH,
  SCORES,
  STEP_X,
  beatFloorFor,
  beatFor,
  clampPlayerX,
  formationLeftFor,
  formationTopFor,
} from '../../src/lib/invaders/rules';

describe('measured geometry', () => {
  it('matches the handoff formation', () => {
    expect(RANKS).toBe(5);
    expect(COLUMNS).toBe(9);
    expect(CELL_W).toBeCloseTo(57.9, 5);
    expect(CELL_H).toBeCloseTo(46.8, 5);
    expect(COLUMN_PITCH).toBeCloseTo(77.9, 5);
    expect(RANK_PITCH).toBeCloseTo(61.8, 5);
  });

  it('derives a formation 681.1 by 294 from the pitches', () => {
    expect(FORMATION_W).toBeCloseTo(681.1, 5);
    expect(FORMATION_H).toBeCloseTo(294, 5);
  });

  it('places wave one where the handoff says: y 26 to 320', () => {
    expect(FORMATION_TOP).toBe(26);
    expect(FORMATION_TOP + FORMATION_H).toBeCloseTo(320, 5);
  });

  it('steps one glyph cell per beat, not one sprite', () => {
    expect(STEP_X).toBeCloseTo(57.9 / 7, 5);
  });
});

describe('formationLeftFor', () => {
  // The field width is fluid, so the formation is centred rather than placed at
  // a fixed x. The handoff's origin of 180.4 at a 1042px field is what proves
  // it: that number is exactly half the leftover.
  it('reproduces the handoff origin at the reference width', () => {
    expect(formationLeftFor(1042)).toBeCloseTo(180.45, 2);
  });

  it('keeps the formation on the field at the 900px trigger floor', () => {
    // 900 viewport, less p-7 either side, less the 1px border either side.
    const narrowest = 900 - 56 - 2;
    expect(formationLeftFor(narrowest)).toBeGreaterThan(0);
  });
});

describe('formationTopFor', () => {
  it('starts wave one at the measured top', () => {
    expect(formationTopFor(1)).toBe(26);
  });

  it('starts wave two one rank lower', () => {
    expect(formationTopFor(2)).toBeCloseTo(26 + 61.8, 5);
  });

  // The field is 466px and the formation is 294px, so there is 74.56px between
  // the formation's bottom row and the top of the player. One rank pitch is
  // 61.8px, so exactly one wave of drop fits. After that only the beat floor
  // carries the difficulty. This cap is a consequence of the handoff's own
  // measurements, not a choice.
  it('holds there, because a second rank would reach the player', () => {
    expect(formationTopFor(3)).toEqual(formationTopFor(2));
    expect(formationTopFor(9)).toEqual(formationTopFor(2));
  });

  it('leaves the bottom rank clear of the player at every wave', () => {
    for (const wave of [1, 2, 3, 7]) {
      expect(formationTopFor(wave) + FORMATION_H).toBeLessThan(PLAYER_TOP);
    }
  });
});

describe('beatFor', () => {
  it('starts at 620ms', () => {
    expect(beatFor(0)).toBe(BEAT_START);
  });

  it('shortens 6 percent per kill', () => {
    expect(beatFor(1)).toBeCloseTo(BEAT_START * BEAT_DECAY, 5);
    expect(beatFor(2)).toBeCloseTo(BEAT_START * BEAT_DECAY ** 2, 5);
  });

  it('never goes under the floor', () => {
    expect(beatFor(1000)).toBe(BEAT_FLOOR);
  });

  it('takes a lower floor for later waves', () => {
    expect(beatFor(1000, 50)).toBe(50);
  });

  it('pins to the floor before the formation is cleared', () => {
    // 45 invaders exist. If the floor only bound after the last kill the beat
    // would never actually reach it.
    expect(beatFor(RANKS * COLUMNS - 1)).toBe(BEAT_FLOOR);
  });
});

describe('beatFloorFor', () => {
  it('is the base floor on wave one', () => {
    expect(beatFloorFor(1)).toBe(BEAT_FLOOR);
  });

  it('drops 10ms a wave', () => {
    expect(beatFloorFor(2)).toBe(80);
    expect(beatFloorFor(4)).toBe(60);
  });

  it('stops at 50ms', () => {
    expect(beatFloorFor(5)).toBe(50);
    expect(beatFloorFor(20)).toBe(50);
  });
});

describe('clampPlayerX', () => {
  it('holds the whole cannon on the field', () => {
    expect(clampPlayerX(-50, 1042)).toBe(0);
    expect(clampPlayerX(5000, 1042)).toBeCloseTo(1042 - CELL_W, 5);
  });

  it('leaves a legal position alone', () => {
    expect(clampPlayerX(300, 1042)).toBe(300);
  });
});

describe('the rest of the table', () => {
  it('scores each rank by its band', () => {
    expect(SCORES).toEqual([30, 20, 20, 10, 10]);
  });

  it('gives three lives and at most three bombs', () => {
    expect(LIVES).toBe(3);
    expect(MAX_BOMBS).toBe(3);
  });

  it('puts the player 34px off the bottom of a 466px field', () => {
    expect(FIELD_H).toBe(466);
    expect(PLAYER_TOP).toBeCloseTo(FIELD_H - 34 - PLAYER_H, 5);
  });
});
