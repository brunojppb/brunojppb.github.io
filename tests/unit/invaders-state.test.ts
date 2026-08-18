import { beforeEach, describe, expect, it } from 'vitest';
import {
  createGame,
  deathFor,
  playerRect,
  startGame,
  step,
  togglePause,
  type GameState,
  type Input,
} from '../../src/lib/invaders/state';
import { alive, invaderRect } from '../../src/lib/invaders/formation';
import { litCells } from '../../src/lib/invaders/bunkers';
import {
  BOMB_H,
  CELL_H,
  CELL_W,
  GROUND_Y,
  HIT_FLASH_MS,
  LIVES,
  MAX_BOMBS,
  PLAYER_SPEED,
  PLAYER_TOP,
  RANKS,
  RESPAWN_MS,
  WAVE_CLEAR_MS,
} from '../../src/lib/invaders/rules';

const FIELD_W = 1042;
const IDLE: Input = { left: false, right: false, fire: false };

/** An rng that reads from a queue and then repeats its last value. */
function queued(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

const NEVER_BOMB = () => 0.99;
const ALWAYS_BOMB = () => 0;

let game: GameState;

beforeEach(() => {
  game = createGame(4820, FIELD_W);
});

describe('createGame', () => {
  it('opens on the title screen with the stored hi score', () => {
    expect(game.phase).toBe('title');
    expect(game.hi).toBe(4820);
    expect(game.score).toBe(0);
    expect(game.wave).toBe(1);
    expect(game.lives).toBe(LIVES);
  });

  it('centres the cannon', () => {
    expect(game.playerX).toBeCloseTo((FIELD_W - CELL_W) / 2, 5);
  });

  it('does not run until it is started', () => {
    const before = game.formation.left;
    step(game, 5000, IDLE, NEVER_BOMB);
    expect(game.formation.left).toBe(before);
    expect(game.now).toBe(0);
  });
});

describe('startGame', () => {
  it('moves to playing and clears the last run', () => {
    game.score = 900;
    game.wave = 4;
    game.lives = 1;
    startGame(game);
    expect(game.phase).toBe('playing');
    expect(game.score).toBe(0);
    expect(game.wave).toBe(1);
    expect(game.lives).toBe(LIVES);
    expect(game.death).toBeNull();
  });

  it('keeps the hi score, which outlives the run', () => {
    startGame(game);
    expect(game.hi).toBe(4820);
  });
});

describe('the player', () => {
  beforeEach(() => startGame(game));

  it('moves smoothly at 380px a second', () => {
    const from = game.playerX;
    step(game, 1000, { left: false, right: true, fire: false }, NEVER_BOMB);
    expect(game.playerX).toBeCloseTo(from + PLAYER_SPEED, 5);
  });

  it('stays on the field', () => {
    for (let i = 0; i < 20; i += 1) {
      step(game, 100, { left: true, right: false, fire: false }, NEVER_BOMB);
    }
    expect(game.playerX).toBe(0);
  });

  it('does not move when both directions are held', () => {
    const from = game.playerX;
    step(game, 100, { left: true, right: true, fire: false }, NEVER_BOMB);
    expect(game.playerX).toBe(from);
  });
});

describe('firing', () => {
  beforeEach(() => startGame(game));

  it('puts one shot in flight, centred on the cannon', () => {
    step(game, 16, { ...IDLE, fire: true }, NEVER_BOMB);
    expect(game.shot).not.toBeNull();
    expect(game.shot!.x).toBeCloseTo(game.playerX + CELL_W / 2 - 1.5, 5);
    expect(game.shot!.y).toBeLessThanOrEqual(PLAYER_TOP);
  });

  it('refuses a second shot while the first is in flight', () => {
    step(game, 16, { ...IDLE, fire: true }, NEVER_BOMB);
    const first = game.shot;
    step(game, 16, { ...IDLE, fire: true }, NEVER_BOMB);
    expect(game.shot!.y).toBeLessThan(first!.y);
    expect(game.shot!.x).toBe(first!.x);
  });

  it('allows the next shot once the first has left the field', () => {
    step(game, 16, { ...IDLE, fire: true }, NEVER_BOMB);
    step(game, 2000, IDLE, NEVER_BOMB);
    expect(game.shot).toBeNull();
    step(game, 16, { ...IDLE, fire: true }, NEVER_BOMB);
    expect(game.shot).not.toBeNull();
  });
});

describe('killing an invader', () => {
  beforeEach(() => startGame(game));

  it('scores it, removes it, and takes the shot with it', () => {
    // Put the shot just under the bottom rank of the middle column.
    const target = game.formation.invaders.find((i) => i.rank === RANKS - 1 && i.col === 4)!;
    const box = invaderRect(game.formation, target);
    game.shot = { x: box.x + CELL_W / 2, y: box.y + box.h - 1 };

    step(game, 16, IDLE, NEVER_BOMB);

    expect(target.alive).toBe(false);
    expect(game.score).toBe(10);
    expect(game.shot).toBeNull();
  });

  it('lifts the hi score once the run passes it', () => {
    game.score = 4815;
    const target = game.formation.invaders.find((i) => i.rank === 0 && i.col === 4)!;
    const box = invaderRect(game.formation, target);
    game.shot = { x: box.x + CELL_W / 2, y: box.y + box.h - 1 };

    step(game, 16, IDLE, NEVER_BOMB);

    expect(game.score).toBe(4845);
    expect(game.hi).toBe(4845);
  });
});

describe('bombs', () => {
  beforeEach(() => startGame(game));

  it('drops from the lowest invader in the chosen column', () => {
    // First rng call passes the chance, second picks column index 0.
    step(game, game.formation.nextBeatAt + 1, IDLE, queued([0, 0]));
    expect(game.bombs).toHaveLength(1);

    const lowest = game.formation.invaders.find((i) => i.rank === RANKS - 1 && i.col === 0)!;
    const box = invaderRect(game.formation, lowest);
    expect(game.bombs[0].x).toBeCloseTo(box.x + CELL_W / 2 - 1.5, 5);
    expect(game.bombs[0].y).toBeCloseTo(box.y + CELL_H, 5);
    expect(game.bombs[0].rank).toBe(RANKS - 1);
  });

  it('never has more than three falling', () => {
    for (let i = 0; i < 12; i += 1) {
      step(game, game.formation.nextBeatAt - game.now + 1, IDLE, ALWAYS_BOMB);
    }
    expect(game.bombs.length).toBeLessThanOrEqual(MAX_BOMBS);
  });

  it('drops none when the chance does not pass', () => {
    for (let i = 0; i < 5; i += 1) {
      step(game, game.formation.nextBeatAt - game.now + 1, IDLE, NEVER_BOMB);
    }
    expect(game.bombs).toHaveLength(0);
  });

  it('only drops on a beat, not on every frame', () => {
    step(game, 16, IDLE, ALWAYS_BOMB);
    expect(game.bombs).toHaveLength(0);
  });
});

describe('taking a hit', () => {
  beforeEach(() => startGame(game));

  /** Parks a bomb one frame above the cannon. */
  function bombOnPlayer(g: GameState) {
    g.bombs = [{ x: g.playerX + CELL_W / 2, y: PLAYER_TOP - BOMB_H + 1, rank: 0 }];
  }

  it('costs a life, flashes the field and starts the respawn', () => {
    bombOnPlayer(game);
    step(game, 16, IDLE, NEVER_BOMB);

    expect(game.lives).toBe(LIVES - 1);
    expect(game.hitUntil).toBe(game.now + HIT_FLASH_MS);
    expect(game.respawnUntil).toBe(game.now + RESPAWN_MS);
    expect(game.bombs).toHaveLength(0);
  });

  it('will not let a respawning cannon fire', () => {
    bombOnPlayer(game);
    step(game, 16, IDLE, NEVER_BOMB);
    step(game, 16, { ...IDLE, fire: true }, NEVER_BOMB);
    expect(game.shot).toBeNull();
  });

  it('lets a respawning cannon still move', () => {
    bombOnPlayer(game);
    step(game, 16, IDLE, NEVER_BOMB);
    const from = game.playerX;
    step(game, 100, { ...IDLE, right: true }, NEVER_BOMB);
    expect(game.playerX).toBeGreaterThan(from);
  });

  it('cannot be hit again while respawning', () => {
    bombOnPlayer(game);
    step(game, 16, IDLE, NEVER_BOMB);
    bombOnPlayer(game);
    step(game, 16, IDLE, NEVER_BOMB);
    expect(game.lives).toBe(LIVES - 1);
  });

  it('ends the game on the third loss, and records what killed you', () => {
    for (let i = 0; i < LIVES; i += 1) {
      game.respawnUntil = 0;
      bombOnPlayer(game);
      step(game, 16, IDLE, NEVER_BOMB);
    }
    expect(game.lives).toBe(0);
    expect(game.phase).toBe('gameOver');
    expect(game.death).toEqual({ rank: 1, row: RANKS });
  });
});

describe('deathFor', () => {
  // The handoff's line is "killed by rank-1 invader at row 5". Rank counts from
  // the top by score, row counts from the bottom of the formation, which is the
  // only reading where rank 1 and row 5 describe the same invader.
  it('numbers the top rank as rank 1 in row 5', () => {
    expect(deathFor(0)).toEqual({ rank: 1, row: 5 });
  });

  it('numbers the bottom rank as rank 5 in row 1', () => {
    expect(deathFor(RANKS - 1)).toEqual({ rank: 5, row: 1 });
  });
});

describe('bombs against bunkers', () => {
  beforeEach(() => startGame(game));

  it('erode the bunker and stop the bomb', () => {
    const bunker = game.bunkers[0];
    const before = litCells(bunker);
    game.bombs = [{ x: bunker.x + CELL_W / 2, y: 352 - BOMB_H + 1, rank: 0 }];

    step(game, 16, IDLE, NEVER_BOMB);

    expect(litCells(bunker)).toBeLessThan(before);
    expect(game.bombs).toHaveLength(0);
  });
});

describe('the ground line', () => {
  beforeEach(() => startGame(game));

  it('ends the game when the lowest rank reaches it', () => {
    game.formation.top = GROUND_Y;
    step(game, game.formation.nextBeatAt + 1, IDLE, NEVER_BOMB);
    expect(game.phase).toBe('gameOver');
    expect(game.death).not.toBeNull();
  });
});

describe('clearing a wave', () => {
  beforeEach(() => startGame(game));

  function clearTheField(g: GameState) {
    for (const inv of g.formation.invaders) inv.alive = false;
  }

  it('moves to waveClear and pays the bonus', () => {
    clearTheField(game);
    step(game, 16, IDLE, NEVER_BOMB);
    expect(game.phase).toBe('waveClear');
    expect(game.waveBonus).toBe(160);
    expect(game.score).toBe(160);
  });

  it('reproduces the mock: 480 points on wave 3', () => {
    game.wave = 3;
    clearTheField(game);
    step(game, 16, IDLE, NEVER_BOMB);
    expect(game.waveBonus).toBe(480);
  });

  it('accepts no input for two seconds', () => {
    clearTheField(game);
    step(game, 16, IDLE, NEVER_BOMB);
    const from = game.playerX;
    step(game, 100, { ...IDLE, right: true, fire: true }, NEVER_BOMB);
    expect(game.playerX).toBe(from);
    expect(game.shot).toBeNull();
    expect(game.phase).toBe('waveClear');
  });

  it('starts the next wave lower, with fresh bunkers and no leftovers', () => {
    clearTheField(game);
    game.bombs = [{ x: 0, y: 0, rank: 0 }];
    step(game, 16, IDLE, NEVER_BOMB);
    const top = game.formation.top;

    step(game, WAVE_CLEAR_MS, IDLE, NEVER_BOMB);

    expect(game.phase).toBe('playing');
    expect(game.wave).toBe(2);
    expect(game.formation.top).toBeGreaterThan(top);
    expect(alive(game.formation)).toHaveLength(45);
    expect(game.bombs).toHaveLength(0);
    for (const b of game.bunkers) expect(litCells(b)).toBe(23);
  });
});

describe('pause', () => {
  beforeEach(() => startGame(game));

  it('stops the clock, so the beat does not fire the moment you resume', () => {
    const beatAt = game.formation.nextBeatAt;
    togglePause(game);
    expect(game.phase).toBe('paused');

    step(game, 10_000, IDLE, ALWAYS_BOMB);
    expect(game.now).toBe(0);
    expect(game.bombs).toHaveLength(0);

    togglePause(game);
    expect(game.phase).toBe('playing');
    expect(game.formation.nextBeatAt).toBe(beatAt);
  });

  it('is ignored outside play', () => {
    game.phase = 'gameOver';
    togglePause(game);
    expect(game.phase).toBe('gameOver');
  });
});

describe('playerRect', () => {
  it('is a sprite cell wide, four rows tall, at the player row', () => {
    expect(playerRect(game).w).toBeCloseTo(CELL_W, 5);
    expect(playerRect(game).y).toBeCloseTo(PLAYER_TOP, 5);
  });
});
