/**
 * The art. Every sprite is a grid of rows, seven cells wide, drawn in
 * Departure Mono block glyphs.
 *
 * These grids are the art rather than a description of it. The transition draws
 * the same cells to a canvas at 520ms, which is why they are data and not
 * markup.
 */

export type Grid = readonly string[];
export type SpritePair = { readonly a: Grid; readonly b: Grid };

export { SPRITE_COLS } from './rules';

/** Rank 1, 30 points. The bottom row alternates. */
export const SQUID: SpritePair = {
  a: ['  ███  ', ' █████ ', '███████', '█ ███ █', '  █ █  '],
  b: ['  ███  ', ' █████ ', '███████', '█ ███ █', ' █   █ '],
};

/** Ranks 2 and 3, 20 points. Antennae and legs swap together. */
export const CRAB: SpritePair = {
  a: ['█     █', ' █████ ', '██ █ ██', '███████', ' █   █ '],
  b: [' █   █ ', ' █████ ', '██ █ ██', '███████', '█     █'],
};

/** Ranks 4 and 5, 10 points. The bottom row alternates. */
export const OCTOPUS: SpritePair = {
  a: [' █████ ', '███████', '█ ███ █', '  ███  ', ' █   █ '],
  b: [' █████ ', '███████', '█ ███ █', '  ███  ', '█     █'],
};

/** Shown for 110ms where an invader died. No particles, no fade. */
export const BURST: Grid = ['█  █  █', ' █ █ █ ', '  ███  ', ' █ █ █ ', '█  █  █'];

export const PLAYER: Grid = ['   █   ', '  ███  ', ' █████ ', '███████'];

export const BUNKER: Grid = [' █████ ', '███████', '███████', '██   ██'];

export const RANK_SPRITE: readonly SpritePair[] = [SQUID, CRAB, CRAB, OCTOPUS, OCTOPUS];

/**
 * The invaders are ranked in ink steps rather than colour, which is what
 * reserves the accent for the player and keeps the field readable at a glance.
 */
export const RANK_INK: readonly string[] = [
  '--color-ink-muted',
  '--color-ink-secondary',
  '--color-ink-secondary',
  '--color-ink-body',
  '--color-ink-body',
];

/** A grid as a row major matrix of lit cells. Bunkers erode through this. */
export function gridCells(grid: Grid): boolean[][] {
  return grid.map((row) => [...row].map((char) => char === '█'));
}
