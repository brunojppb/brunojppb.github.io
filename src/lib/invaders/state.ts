import { bunkerRect, createBunkers, erode, isGone, type Bunker } from './bunkers';
import { overlaps, type Rect } from './collide';
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
  type Formation,
} from './formation';
import {
  advanceBombs,
  advanceShot,
  bombRect,
  shotRect,
  type Bomb,
  type Shot,
} from './projectiles';
import {
  BOMB_CHANCE,
  BOMB_W,
  CELL_H,
  CELL_W,
  GROUND_Y,
  HIT_FLASH_MS,
  LIVES,
  MAX_BOMBS,
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_TOP,
  RANKS,
  RESPAWN_MS,
  SHOT_H,
  SHOT_W,
  WAVE_BONUS,
  WAVE_CLEAR_MS,
} from './rules';

export type Phase = 'title' | 'playing' | 'waveClear' | 'gameOver' | 'paused';

export interface Input {
  left: boolean;
  right: boolean;
  /** True only on the frame the key went down. Holding fire does not autofire. */
  fire: boolean;
}

/** What the game over line reports. */
export interface Death {
  rank: number;
  row: number;
}

export interface GameState {
  phase: Phase;
  fieldW: number;
  /** Game time in milliseconds. It only advances while the game is running. */
  now: number;
  score: number;
  hi: number;
  wave: number;
  lives: number;
  waveBonus: number;
  formation: Formation;
  playerX: number;
  hitUntil: number;
  respawnUntil: number;
  shot: Shot | null;
  bombs: Bomb[];
  bunkers: Bunker[];
  waveClearUntil: number;
  death: Death | null;
}

/**
 * Ranks count from the top by score, rows count from the bottom of the
 * formation. That is the only reading where the handoff's "rank-1 invader at
 * row 5" names one invader.
 */
export function deathFor(rank: number): Death {
  return { rank: rank + 1, row: RANKS - rank };
}

export function playerRect(s: GameState): Rect {
  return { x: s.playerX, y: PLAYER_TOP, w: CELL_W, h: PLAYER_H };
}

export function createGame(hi: number, fieldW: number): GameState {
  return {
    phase: 'title',
    fieldW,
    now: 0,
    score: 0,
    hi,
    wave: 1,
    lives: LIVES,
    waveBonus: 0,
    formation: createFormation(1, fieldW, 0),
    playerX: (fieldW - CELL_W) / 2,
    hitUntil: 0,
    respawnUntil: 0,
    shot: null,
    bombs: [],
    bunkers: createBunkers(fieldW),
    waveClearUntil: 0,
    death: null,
  };
}

/** Starts a run from the title screen or from game over. The hi score survives. */
export function startGame(s: GameState): void {
  s.phase = 'playing';
  s.score = 0;
  s.wave = 1;
  s.lives = LIVES;
  s.waveBonus = 0;
  s.formation = createFormation(1, s.fieldW, s.now);
  s.playerX = (s.fieldW - CELL_W) / 2;
  s.hitUntil = 0;
  s.respawnUntil = 0;
  s.shot = null;
  s.bombs = [];
  s.bunkers = createBunkers(s.fieldW);
  s.waveClearUntil = 0;
  s.death = null;
}

export function togglePause(s: GameState): void {
  if (s.phase === 'playing') s.phase = 'paused';
  else if (s.phase === 'paused') s.phase = 'playing';
}

export function step(s: GameState, dt: number, input: Input, rng: () => number): void {
  if (s.phase === 'waveClear') {
    s.now += dt;
    if (s.now >= s.waveClearUntil) nextWave(s);
    return;
  }
  if (s.phase !== 'playing') return;

  s.now += dt;
  clearBursts(s.formation, s.now);
  movePlayer(s, dt, input);
  maybeFire(s, input);
  moveShot(s, dt);
  // Bombs move before the beat drops a new one, for two reasons. A bomb should
  // not be advanced by a whole frame in the frame it appears. And the beat's
  // three-bomb limit then counts the bombs still on the field, rather than
  // holding a slot for one that left on this frame.
  moveBombs(s, dt);
  runBeat(s, rng);
  checkGround(s);
  checkCleared(s);
  if (s.score > s.hi) s.hi = s.score;
}

function movePlayer(s: GameState, dt: number, input: Input): void {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir === 0) return;
  const x = s.playerX + (dir * PLAYER_SPEED * dt) / 1000;
  s.playerX = Math.min(Math.max(x, 0), s.fieldW - CELL_W);
}

function respawning(s: GameState): boolean {
  return s.now < s.respawnUntil;
}

function maybeFire(s: GameState, input: Input): void {
  if (!input.fire || s.shot || respawning(s)) return;
  s.shot = { x: s.playerX + CELL_W / 2 - SHOT_W / 2, y: PLAYER_TOP - SHOT_H };
}

function moveShot(s: GameState, dt: number): void {
  s.shot = advanceShot(s.shot, dt);
  if (!s.shot) return;
  const box = shotRect(s.shot);

  // Bunkers sit below the formation, so the shot meets them first.
  for (const bunker of s.bunkers) {
    if (isGone(bunker) || !overlaps(box, bunkerRect(bunker))) continue;
    if (erode(bunker, box.x + box.w / 2, box.y)) {
      s.shot = null;
      return;
    }
  }

  for (const inv of alive(s.formation)) {
    if (!overlaps(box, invaderRect(s.formation, inv))) continue;
    s.score += killInvader(s.formation, inv, s.now);
    s.shot = null;
    return;
  }
}

function runBeat(s: GameState, rng: () => number): void {
  if (!stepFormation(s.formation, s.now, s.fieldW)) return;
  if (s.bombs.length >= MAX_BOMBS) return;
  if (rng() >= BOMB_CHANCE) return;

  const cols = occupiedColumns(s.formation);
  if (cols.length === 0) return;
  const col = cols[Math.min(cols.length - 1, Math.floor(rng() * cols.length))];
  const source = lowestInColumn(s.formation, col);
  if (!source) return;

  const box = invaderRect(s.formation, source);
  s.bombs.push({
    x: box.x + CELL_W / 2 - BOMB_W / 2,
    y: box.y + CELL_H,
    rank: source.rank,
  });
}

function moveBombs(s: GameState, dt: number): void {
  s.bombs = advanceBombs(s.bombs, dt);
  const survivors: Bomb[] = [];

  for (const bomb of s.bombs) {
    const box = bombRect(bomb);
    let stopped = false;

    for (const bunker of s.bunkers) {
      if (isGone(bunker) || !overlaps(box, bunkerRect(bunker))) continue;
      if (erode(bunker, box.x + box.w / 2, box.y + box.h)) {
        stopped = true;
        break;
      }
    }

    if (!stopped && !respawning(s) && overlaps(box, playerRect(s))) {
      hitPlayer(s, bomb.rank);
      stopped = true;
    }

    if (!stopped) survivors.push(bomb);
  }

  s.bombs = survivors;
}

/**
 * Ends the run.
 *
 * Clearing the timers is the point: game time stops with the phase change, so a
 * flash or respawn timer left in the future would never expire, and the field
 * would stay inverted behind the game over panel.
 */
function endGame(s: GameState, rank: number): void {
  s.death = deathFor(rank);
  s.lives = 0;
  s.phase = 'gameOver';
  s.hitUntil = 0;
  s.respawnUntil = 0;
  // s.now freezes once the phase leaves playing, so any burst deadline still
  // in the future would never resolve. Clear them all now, while time still moves.
  clearBursts(s.formation, Infinity);
}

function hitPlayer(s: GameState, rank: number): void {
  s.lives -= 1;
  if (s.lives <= 0) {
    endGame(s, rank);
    return;
  }
  s.hitUntil = s.now + HIT_FLASH_MS;
  s.respawnUntil = s.now + RESPAWN_MS;
}

function checkGround(s: GameState): void {
  if (s.phase !== 'playing') return;
  if (formationBottom(s.formation) < GROUND_Y) return;
  const living = alive(s.formation);
  const lowest = living.length > 0 ? Math.max(...living.map((inv) => inv.rank)) : 0;
  endGame(s, lowest);
}

function checkCleared(s: GameState): void {
  if (s.phase !== 'playing' || alive(s.formation).length > 0) return;
  s.waveBonus = WAVE_BONUS * s.wave;
  s.score += s.waveBonus;
  s.phase = 'waveClear';
  s.waveClearUntil = s.now + WAVE_CLEAR_MS;
}

function nextWave(s: GameState): void {
  s.wave += 1;
  s.formation = createFormation(s.wave, s.fieldW, s.now);
  s.bunkers = createBunkers(s.fieldW);
  s.shot = null;
  s.bombs = [];
  s.playerX = (s.fieldW - CELL_W) / 2;
  s.respawnUntil = 0;
  s.hitUntil = 0;
  s.phase = 'playing';
}
