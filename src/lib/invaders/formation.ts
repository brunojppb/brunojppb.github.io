import type { Rect } from './collide';
import {
  BURST_MS,
  CELL_H,
  CELL_W,
  COLUMNS,
  COLUMN_PITCH,
  DESCENT,
  RANKS,
  RANK_PITCH,
  SCORES,
  STEP_X,
  beatFloorFor,
  beatFor,
  formationLeftFor,
  formationTopFor,
} from './rules';

export interface Invader {
  /** 0 is the top rank, worth 30. 4 is the bottom, worth 10. */
  rank: number;
  col: number;
  alive: boolean;
  /** While this is in the future the burst sprite shows in the invader's place. */
  burstUntil: number;
}

export interface Formation {
  left: number;
  top: number;
  dir: 1 | -1;
  frame: 'a' | 'b';
  invaders: Invader[];
  kills: number;
  nextBeatAt: number;
  beatFloor: number;
}

export function createFormation(wave: number, fieldW: number, now: number): Formation {
  const invaders: Invader[] = [];
  for (let rank = 0; rank < RANKS; rank += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      invaders.push({ rank, col, alive: true, burstUntil: 0 });
    }
  }
  const beatFloor = beatFloorFor(wave);
  return {
    left: formationLeftFor(fieldW),
    top: formationTopFor(wave),
    dir: 1,
    frame: 'a',
    invaders,
    kills: 0,
    nextBeatAt: now + beatFor(0, beatFloor),
    beatFloor,
  };
}

export function invaderRect(f: Formation, inv: Invader): Rect {
  return {
    x: f.left + inv.col * COLUMN_PITCH,
    y: f.top + inv.rank * RANK_PITCH,
    w: CELL_W,
    h: CELL_H,
  };
}

export function alive(f: Formation): Invader[] {
  return f.invaders.filter((inv) => inv.alive);
}

export function occupiedColumns(f: Formation): number[] {
  return [...new Set(alive(f).map((inv) => inv.col))].sort((a, b) => a - b);
}

/** The living invader nearest the player in `col`, which is the one that bombs. */
export function lowestInColumn(f: Formation, col: number): Invader | null {
  let found: Invader | null = null;
  for (const inv of f.invaders) {
    if (!inv.alive || inv.col !== col) continue;
    if (!found || inv.rank > found.rank) found = inv;
  }
  return found;
}

/** The bottom edge of the lowest living rank. Reaching the ground ends the game. */
export function formationBottom(f: Formation): number {
  const living = alive(f);
  if (living.length === 0) return f.top;
  const lowest = Math.max(...living.map((inv) => inv.rank));
  return f.top + lowest * RANK_PITCH + CELL_H;
}

/**
 * Advances the block if its beat is due. Returns true when a step happened, so
 * the caller knows a beat has passed and can drop a bomb on it.
 *
 * A step is either a horizontal jump or a descent, never both: touching a wall
 * spends the beat on the drop.
 */
export function stepFormation(f: Formation, now: number, fieldW: number): boolean {
  if (now < f.nextBeatAt) return false;

  f.frame = f.frame === 'a' ? 'b' : 'a';

  const living = alive(f);
  if (living.length > 0) {
    const cols = living.map((inv) => inv.col);
    const nextLeft = f.left + f.dir * STEP_X;
    const edgeLeft = nextLeft + Math.min(...cols) * COLUMN_PITCH;
    const edgeRight = nextLeft + Math.max(...cols) * COLUMN_PITCH + CELL_W;

    if (edgeLeft < 0 || edgeRight > fieldW) {
      f.top += DESCENT;
      f.dir = f.dir === 1 ? -1 : 1;
    } else {
      f.left = nextLeft;
    }
  }

  f.nextBeatAt = now + beatFor(f.kills, f.beatFloor);
  return true;
}

/** Kills an invader and returns the points it was worth. */
export function killInvader(f: Formation, inv: Invader, now: number): number {
  inv.alive = false;
  inv.burstUntil = now + BURST_MS;
  f.kills += 1;
  return SCORES[inv.rank];
}

export function clearBursts(f: Formation, now: number): void {
  for (const inv of f.invaders) {
    if (inv.burstUntil !== 0 && now >= inv.burstUntil) inv.burstUntil = 0;
  }
}
