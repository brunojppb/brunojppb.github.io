/**
 * Every number the design measured, and the four that derive from them.
 *
 * These are game metrics, not design tokens. None of them sits on the 11 and
 * 5.5 pixel grid, and none belongs in `theme.css`. `view.ts` writes them onto
 * the field as CSS custom properties, which is why no Tailwind utility on the
 * field ever carries an arbitrary value.
 */

// ---- the formation ---------------------------------------------------------

export const RANKS = 5;
export const COLUMNS = 9;

/** A sprite grid is seven cells wide. */
export const SPRITE_COLS = 7;

/** A sprite cell at `font-size: 13px` and `line-height: .72`. */
export const CELL_W = 57.9;
export const CELL_H = 46.8;

/** One sprite row. Five of them make a 46.8px invader. */
export const ROW_H = CELL_H / RANKS;

export const COLUMN_PITCH = 77.9;
export const RANK_PITCH = 61.8;

export const FORMATION_W = (COLUMNS - 1) * COLUMN_PITCH + CELL_W;
export const FORMATION_H = (RANKS - 1) * RANK_PITCH + CELL_H;

/** Wave one, which the handoff measures as occupying y 26 to 320. */
export const FORMATION_TOP = 26;

/** One glyph cell. The block jumps this far on every beat, with no tween. */
export const STEP_X = CELL_W / SPRITE_COLS;

/** On touching either wall the block drops this far and reverses. No easing. */
export const DESCENT = 16;

// ---- the field -------------------------------------------------------------

export const FIELD_H = 466;

export const GROUND_FROM_BOTTOM = 24;
export const GROUND_Y = FIELD_H - GROUND_FROM_BOTTOM;

export const BUNKER_COUNT = 4;
export const BUNKER_TOP = 352;
export const BUNKER_GAP = 96;
export const BUNKER_ROWS = 4;
export const BUNKER_H = ROW_H * BUNKER_ROWS;
/** Four bunkers with 96px between them, taken as one centred group. */
export const BUNKERS_W = BUNKER_COUNT * CELL_W + (BUNKER_COUNT - 1) * BUNKER_GAP;

export const PLAYER_ROWS = 4;
export const PLAYER_H = ROW_H * PLAYER_ROWS;
export const PLAYER_FROM_BOTTOM = 34;
export const PLAYER_TOP = FIELD_H - PLAYER_FROM_BOTTOM - PLAYER_H;

// ---- speeds and timings ----------------------------------------------------

export const PLAYER_SPEED = 380; // px per second, the only smooth motion
export const SHOT_SPEED = 620;
export const BOMB_SPEED = 210;

export const SHOT_W = 3;
export const SHOT_H = 19;
export const BOMB_W = 3;
export const BOMB_H = 15;
export const MAX_BOMBS = 3;

/**
 * The opening beat. `--game-beat` in theme.css carries the same value as the
 * design system's record of it. The runtime reads this one, so the audit in
 * `tests/e2e/invaders.spec.ts` fails if the two ever drift apart.
 */
export const BEAT_START = 620;
export const BEAT_DECAY = 0.94;
export const BEAT_FLOOR = 90;

/** The chance a beat drops a bomb, when fewer than three are already falling. */
export const BOMB_CHANCE = 0.35;

export const BURST_MS = 110;
export const HIT_FLASH_MS = 60;
export const RESPAWN_MS = 900;
export const WAVE_CLEAR_MS = 2000;

export const LIVES = 3;
export const SCORES: readonly number[] = [30, 20, 20, 10, 10];

/** Paid on clearing a wave, times the wave number. 160 x 3 is the mock's + 480. */
export const WAVE_BONUS = 160;

// ---- sprite metrics the DOM needs -----------------------------------------

export const SPRITE_PX = 13;
export const LIVES_SPRITE_PX = 7;
export const SPRITE_LINE_HEIGHT = 0.72;

/** The title screen's score table draws its sprites smaller, in a fixed column. */
export const SCORE_TABLE_SPRITE_PX = 11;
export const SCORE_TABLE_SPRITE_W = 60;

export const HI_SCORE_KEY = 'bpaulino:invaders:hi';

/** The trigger, the game and the `i n v` route all sit behind this. */
export const DESKTOP_QUERY = '(min-width: 900px) and (pointer: fine)';

// ---- derived ---------------------------------------------------------------

/**
 * The beat after `kills` invaders have died, in milliseconds.
 */
export function beatFor(kills: number, floor: number = BEAT_FLOOR): number {
  return Math.max(floor, BEAT_START * BEAT_DECAY ** kills);
}

/**
 * The beat floor for a wave. Later waves get a lower one, which is what makes
 * them harder once the formation can no longer start any lower.
 */
export function beatFloorFor(wave: number): number {
  return Math.max(50, BEAT_FLOOR - (wave - 1) * 10);
}

/**
 * The formation's top for a wave.
 *
 * The design asks each wave to start one rank lower. Only one wave of drop
 * fits: the field is 466px, the formation is 294px, and that leaves 74.56px
 * above the player against a rank pitch of 61.8px. Waves past the second start
 * where the second does and take their difficulty from the beat floor instead.
 */
export function formationTopFor(wave: number): number {
  return FORMATION_TOP + Math.min(wave - 1, 1) * RANK_PITCH;
}

/**
 * The formation's left edge in a field of `fieldW`.
 *
 * The field is fluid: it is the window's inner width, which runs from 842px at
 * the 900px trigger floor to 1042px at `max-w-window`. The formation is centred
 * in it, which is what the handoff's origin of 180.4 at 1042px describes.
 */
export function formationLeftFor(fieldW: number): number {
  return (fieldW - FORMATION_W) / 2;
}

/** `x` held so the whole cannon stays on the field. */
export function clampPlayerX(x: number, fieldW: number): number {
  return Math.min(Math.max(x, 0), fieldW - CELL_W);
}
