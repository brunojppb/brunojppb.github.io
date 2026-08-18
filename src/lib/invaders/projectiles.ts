import type { Rect } from './collide';
import { BOMB_H, BOMB_SPEED, BOMB_W, FIELD_H, SHOT_H, SHOT_SPEED, SHOT_W } from './rules';

/** `x` and `y` are the top left corner, so only the rect helpers know the size. */
export interface Shot {
  x: number;
  y: number;
}

export interface Bomb {
  x: number;
  y: number;
  /** The rank that dropped it, which the game over line reports. */
  rank: number;
}

export function shotRect(shot: Shot): Rect {
  return { x: shot.x, y: shot.y, w: SHOT_W, h: SHOT_H };
}

export function bombRect(bomb: Bomb): Rect {
  return { x: bomb.x, y: bomb.y, w: BOMB_W, h: BOMB_H };
}

/** The shot after `dt` milliseconds, or null once it has left the field. */
export function advanceShot(shot: Shot | null, dt: number): Shot | null {
  if (!shot) return null;
  const y = shot.y - (SHOT_SPEED * dt) / 1000;
  if (y + SHOT_H <= 0) return null;
  return { x: shot.x, y };
}

/** Every bomb after `dt` milliseconds, minus the ones past the bottom. */
export function advanceBombs(bombs: Bomb[], dt: number): Bomb[] {
  const fall = (BOMB_SPEED * dt) / 1000;
  return bombs
    .map((bomb) => ({ x: bomb.x, y: bomb.y + fall, rank: bomb.rank }))
    .filter((bomb) => bomb.y < FIELD_H);
}
