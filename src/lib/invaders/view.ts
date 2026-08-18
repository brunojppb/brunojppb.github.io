import { bunkerRows, isGone } from './bunkers';
import {
  BOMB_H,
  BOMB_W,
  BUNKER_TOP,
  COLUMN_PITCH,
  FIELD_H,
  GROUND_FROM_BOTTOM,
  LIVES,
  LIVES_SPRITE_PX,
  MAX_BOMBS,
  PLAYER_TOP,
  RANK_PITCH,
  SCORES,
  SCORE_TABLE_SPRITE_PX,
  SCORE_TABLE_SPRITE_W,
  SHOT_H,
  SHOT_W,
  SPRITE_LINE_HEIGHT,
  SPRITE_PX,
  WAVE_CLEAR_MS,
} from './rules';
import { BURST, CRAB, OCTOPUS, PLAYER, RANK_INK, RANK_SPRITE, SQUID, type Grid } from './sprites';
import type { GameState, Phase } from './state';

export interface Refs {
  root: HTMLElement;
  field: HTMLElement;
  formation: HTMLElement;
  bunkers: HTMLElement;
  bombs: HTMLElement;
  shot: HTMLElement;
  player: HTMLElement;
  score: HTMLElement;
  hi: HTMLElement;
  wave: HTMLElement;
  lives: HTMLElement;
  scoreTable: HTMLElement;
  cleared: HTMLElement;
  bonus: HTMLElement;
  nextWave: HTMLElement;
  death: HTMLElement;
  exit: HTMLElement;
  /** Indexed exactly as `state.formation.invaders`. */
  invaders: HTMLElement[];
  bunkerPres: HTMLPreElement[];
  bombEls: HTMLElement[];
}

const PHASES: Phase[] = ['title', 'playing', 'waveClear', 'gameOver', 'paused'];

function need<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`invaders: the shell is missing ${selector}`);
  return el;
}

export function collect(root: HTMLElement): Refs {
  return {
    root,
    field: need(root, '[data-invaders-field]'),
    formation: need(root, '[data-invaders-formation]'),
    bunkers: need(root, '[data-invaders-bunkers]'),
    bombs: need(root, '[data-invaders-bombs]'),
    shot: need(root, '[data-invaders-shot]'),
    player: need(root, '[data-invaders-player]'),
    score: need(root, '[data-invaders-score]'),
    hi: need(root, '[data-invaders-hi]'),
    wave: need(root, '[data-invaders-wave]'),
    lives: need(root, '[data-invaders-lives]'),
    scoreTable: need(root, '[data-invaders-score-table]'),
    cleared: need(root, '[data-invaders-cleared]'),
    bonus: need(root, '[data-invaders-bonus]'),
    nextWave: need(root, '[data-invaders-next-wave]'),
    death: need(root, '[data-invaders-death]'),
    exit: need(root, '[data-invaders-exit]'),
    invaders: [],
    bunkerPres: [],
    bombEls: [],
  };
}

/**
 * A sprite: a `<pre>` with one `<div>` per row.
 *
 * One block element per line, the same rule `CodeBlock` obeys and for the same
 * reason: newlines between inline elements are not reliable. `font-mono` comes
 * from `.invaders-sprite`, because preflight points every `pre` at the reading
 * face and a sprite is not prose.
 */
function sprite(grid: Grid, className: string): HTMLPreElement {
  const pre = document.createElement('pre');
  pre.className = `invaders-sprite ${className}`;
  for (const row of grid) {
    const line = document.createElement('div');
    line.textContent = row;
    pre.append(line);
  }
  return pre;
}

function px(value: number): string {
  return `${value}px`;
}

function pad(value: number, width: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(width, '0');
}

/** Writes the game metrics onto the field, once, as custom properties. */
function setMetrics(refs: Refs): void {
  const field = refs.field.style;
  field.setProperty('--invaders-field-h', px(FIELD_H));
  field.setProperty('--invaders-ground', px(GROUND_FROM_BOTTOM));
  field.setProperty('--invaders-sprite-px', px(SPRITE_PX));
  field.setProperty('--invaders-line-height', String(SPRITE_LINE_HEIGHT));
  field.setProperty('--invaders-player-top', px(PLAYER_TOP));
  field.setProperty('--invaders-shot-w', px(SHOT_W));
  field.setProperty('--invaders-shot-h', px(SHOT_H));
  field.setProperty('--invaders-bomb-w', px(BOMB_W));
  field.setProperty('--invaders-bomb-h', px(BOMB_H));
}

/**
 * Builds everything made of sprites. Runs once per wave.
 *
 * Both sprite frames exist in the DOM for every invader, and the field decides
 * which shows. That is what makes a beat one attribute write rather than 225
 * text writes.
 */
export function build(refs: Refs, s: GameState): void {
  setMetrics(refs);

  refs.formation.replaceChildren();
  refs.invaders = s.formation.invaders.map((inv) => {
    const el = document.createElement('div');
    el.className = 'invaders-invader';
    el.dataset.state = 'alive';
    el.style.setProperty('--invaders-x', px(inv.col * COLUMN_PITCH));
    el.style.setProperty('--invaders-y', px(inv.rank * RANK_PITCH));
    el.style.setProperty('--invaders-ink', `var(${RANK_INK[inv.rank]})`);
    const pair = RANK_SPRITE[inv.rank];
    el.append(
      sprite(pair.a, 'invaders-frame-a'),
      sprite(pair.b, 'invaders-frame-b'),
      sprite(BURST, 'invaders-burst')
    );
    refs.formation.append(el);
    return el;
  });

  refs.bunkers.replaceChildren();
  refs.bunkerPres = s.bunkers.map((bunker) => {
    const wrap = document.createElement('div');
    wrap.className = 'invaders-bunker';
    wrap.style.setProperty('--invaders-x', px(bunker.x));
    wrap.style.setProperty('--invaders-y', px(BUNKER_TOP));
    wrap.style.setProperty('--invaders-ink', 'var(--color-ink-faint)');
    const pre = sprite(bunkerRows(bunker), 'invaders-bunker-sprite');
    wrap.append(pre);
    refs.bunkers.append(wrap);
    return pre;
  });

  refs.player.replaceChildren(sprite(PLAYER, 'invaders-player-sprite'));
  refs.player.style.setProperty('--invaders-ink', 'var(--color-accent)');

  refs.bombs.replaceChildren();
  refs.bombEls = Array.from({ length: MAX_BOMBS }, () => {
    const el = document.createElement('div');
    el.className = 'invaders-bomb';
    el.hidden = true;
    refs.bombs.append(el);
    return el;
  });

  buildLives(refs);
  buildScoreTable(refs);
}

/** One 7px cannon per life, drawn rather than counted. */
function buildLives(refs: Refs): void {
  refs.lives.replaceChildren();
  for (let i = 0; i < LIVES; i += 1) {
    const pre = sprite(PLAYER, 'invaders-life');
    pre.style.setProperty('--invaders-sprite-px', px(LIVES_SPRITE_PX));
    pre.style.setProperty('--invaders-ink', 'var(--color-accent)');
    refs.lives.append(pre);
  }
}

/** The title screen's score table, which is how the original taught its rules. */
function buildScoreTable(refs: Refs): void {
  // The points come from SCORES rather than being written out again. This table
  // is how the game teaches its own scoring, so a legend that drifts from what
  // the game pays out would be worse than no legend.
  const rows: [Grid, number, string][] = [
    [SQUID.a, SCORES[0], RANK_INK[0]],
    [CRAB.a, SCORES[1], RANK_INK[1]],
    [OCTOPUS.a, SCORES[3], RANK_INK[3]],
  ];
  refs.scoreTable.replaceChildren();
  for (const [grid, points, ink] of rows) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-4';

    const pre = sprite(grid, 'invaders-table-sprite');
    pre.style.setProperty('--invaders-sprite-px', px(SCORE_TABLE_SPRITE_PX));
    pre.style.setProperty('--invaders-ink', `var(${ink})`);
    pre.style.width = px(SCORE_TABLE_SPRITE_W);

    const value = document.createElement('span');
    value.className = 'text-md text-ink-body';
    value.textContent = `= ${points} PTS`;

    row.append(pre, value);
    refs.scoreTable.append(row);
  }
}

/** Runs once a frame. Writes only transforms, text and attributes. */
export function render(refs: Refs, s: GameState): void {
  refs.score.textContent = pad(s.score, 6);
  refs.hi.textContent = pad(s.hi, 6);
  refs.wave.textContent = pad(s.wave, 2);

  const lives = refs.lives.children;
  for (let i = 0; i < lives.length; i += 1) {
    (lives[i] as HTMLElement).hidden = i >= s.lives;
  }

  refs.field.dataset.frame = s.formation.frame;
  refs.formation.style.transform = `translate3d(${s.formation.left}px, ${s.formation.top}px, 0)`;

  for (let i = 0; i < refs.invaders.length; i += 1) {
    const inv = s.formation.invaders[i];
    refs.invaders[i].dataset.state = inv.alive
      ? 'alive'
      : inv.burstUntil > s.now
        ? 'burst'
        : 'dead';
  }

  for (let i = 0; i < refs.bunkerPres.length; i += 1) {
    const bunker = s.bunkers[i];
    const pre = refs.bunkerPres[i];
    if (isGone(bunker)) {
      pre.hidden = true;
      continue;
    }
    const rows = bunkerRows(bunker);
    for (let row = 0; row < rows.length; row += 1) {
      const line = pre.children[row] as HTMLElement;
      if (line.textContent !== rows[row]) line.textContent = rows[row];
    }
  }

  refs.player.style.transform = `translate3d(${s.playerX}px, 0, 0)`;
  toggle(refs.player, 'respawning', s.now < s.respawnUntil);
  toggle(refs.field, 'hit', s.now < s.hitUntil);
  toggle(refs.field, 'dim', s.phase === 'paused');

  refs.shot.hidden = s.shot === null;
  if (s.shot) refs.shot.style.transform = `translate3d(${s.shot.x}px, ${s.shot.y}px, 0)`;

  for (let i = 0; i < refs.bombEls.length; i += 1) {
    const bomb = s.bombs[i];
    const el = refs.bombEls[i];
    el.hidden = bomb === undefined;
    if (bomb) el.style.transform = `translate3d(${bomb.x}px, ${bomb.y}px, 0)`;
  }

  renderPanels(refs, s);
}

function toggle(el: HTMLElement, name: string, on: boolean): void {
  if (on) el.setAttribute(`data-${name}`, '');
  else el.removeAttribute(`data-${name}`);
}

function renderPanels(refs: Refs, s: GameState): void {
  for (const phase of PHASES) {
    const panel = refs.root.querySelector<HTMLElement>(`[data-invaders-panel="${phase}"]`);
    if (panel) panel.hidden = phase !== s.phase;
    const footer = refs.root.querySelector<HTMLElement>(`[data-invaders-footer="${phase}"]`);
    if (footer) footer.hidden = phase !== footerFor(s.phase);
  }

  if (s.phase === 'waveClear') {
    refs.cleared.textContent = `WAVE ${pad(s.wave, 2)} CLEARED`;
    refs.bonus.textContent = String(s.waveBonus);
    const seconds = WAVE_CLEAR_MS / 1000;
    refs.nextWave.textContent =
      `wave ${pad(s.wave + 1, 2)} in ${seconds}s · they come down faster now`;
  }

  if (s.phase === 'gameOver' && s.death) {
    refs.death.textContent = `invaders: killed by rank-${s.death.rank} invader at row ${s.death.row}`;
    // 137 is what a shell reports for a process killed outright. It is the joke,
    // and it is not an apology.
    refs.exit.textContent = `exit 137 · score ${pad(s.score, 6)} · hi ${pad(s.hi, 6)}`;
  }
}

/** Title and wave clear borrow the playing footer: the controls have not changed. */
function footerFor(phase: Phase): Phase {
  return phase === 'title' || phase === 'waveClear' ? 'playing' : phase;
}
