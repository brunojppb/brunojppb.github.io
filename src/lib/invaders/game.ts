import { HI_SCORE_KEY, clampPlayerX } from './rules';
import { createGame, startGame, step, togglePause, type GameState, type Input } from './state';
import { build, collect, render, type Refs } from './view';

/**
 * The game's lifecycle and its loop. The loop reads input, steps the pure state
 * machine, and hands the result to the view. It decides nothing.
 */

/** A backgrounded tab hands back a huge delta. Capping it stops the block teleporting. */
const MAX_FRAME_MS = 50;

let root: HTMLElement | null = null;
let refs: Refs | null = null;
let state: GameState | null = null;
let trigger: HTMLElement | null = null;
let frame = 0;
let lastFrameAt = 0;
let builtWave = 0;
let savedHi = 0;
let restoreScroll = 0;

const held = { left: false, right: false };
let fireQueued = false;

export function readHiScore(): number {
  const value = Number.parseInt(window.localStorage.getItem(HI_SCORE_KEY) ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function writeHiScore(hi: number): void {
  try {
    window.localStorage.setItem(HI_SCORE_KEY, String(hi));
  } catch {
    // Private browsing refuses the write. The run still counts, it just does not
    // outlive the tab, and a lost hi score is not worth an error.
  }
}

function mount(): HTMLElement {
  const template = document.querySelector<HTMLTemplateElement>('#invaders-template');
  if (!template) throw new Error('invaders: the shell template is missing');
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const el = fragment.querySelector<HTMLElement>('[data-invaders-root]');
  if (!el) throw new Error('invaders: the shell template has no root');

  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Invaders');
  el.tabIndex = -1;
  document.body.append(el);
  return el;
}

function tick(now: number): void {
  frame = requestAnimationFrame(tick);
  if (!state || !refs) return;

  const dt = Math.min(MAX_FRAME_MS, now - lastFrameAt);
  lastFrameAt = now;

  const input: Input = { left: held.left, right: held.right, fire: fireQueued };
  fireQueued = false;

  step(state, dt, input, Math.random);

  // A new wave replaces the formation and the bunkers, so the DOM has to be
  // rebuilt before it is read.
  if (state.wave !== builtWave) {
    builtWave = state.wave;
    build(refs, state);
  }

  render(refs, state);

  if (state.hi > savedHi) {
    savedHi = state.hi;
    writeHiScore(savedHi);
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (!state) return;

  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      void closeGame();
      return;
    case 'Tab':
      // The root claims aria-modal and nothing inside the window is focusable,
      // so Tab has nowhere to go. Without this it walks into the page behind the
      // overlay, which is still interactive.
      event.preventDefault();
      return;
    case 'ArrowLeft':
      event.preventDefault();
      held.left = true;
      return;
    case 'ArrowRight':
      event.preventDefault();
      held.right = true;
      return;
    case ' ':
      event.preventDefault();
      // Tap to fire. The browser repeats keydown while a key is held, and
      // letting that through would be autofire.
      if (event.repeat) return;
      if (state.phase === 'title' || state.phase === 'gameOver') {
        startGame(state);
        // Forces the rebuild in the next tick: startGame makes a fresh
        // formation, and the old elements describe the old one.
        builtWave = 0;
        return;
      }
      fireQueued = true;
      return;
    case 'p':
    case 'P':
      event.preventDefault();
      togglePause(state);
      return;
  }
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') held.left = false;
  if (event.key === 'ArrowRight') held.right = false;
}

/** The field is fluid, so a resize changes where the walls are. */
function onResize(): void {
  if (!state || !refs) return;
  state.fieldW = refs.field.clientWidth;
  state.playerX = clampPlayerX(state.playerX, state.fieldW);
}

export async function openGame(): Promise<void> {
  if (root) return;

  // Mount before anything else. Every line below changes the page, and mount can
  // throw: committing the scroll lock first would leave the reader on a locked
  // page with no Escape listener and no way back short of a reload.
  const mounted = mount();

  trigger = document.querySelector<HTMLElement>('[data-invaders-open]');
  trigger?.setAttribute('data-open', '');
  restoreScroll = window.scrollY;
  document.body.style.overflow = 'hidden';

  // The game mounts before the transition runs. That is how the transition
  // learns where the field will be, so the invaders it draws at 520ms land
  // exactly where the real ones appear at 720ms.
  root = mounted;
  refs = collect(root);
  savedHi = readHiScore();
  state = createGame(savedHi, refs.field.clientWidth);
  builtWave = state.wave;
  build(refs, state);
  render(refs, state);

  const { run } = await import('./transition');
  await run(refs.field.getBoundingClientRect(), 'in');

  root.focus();
  held.left = false;
  held.right = false;
  fireQueued = false;
  lastFrameAt = performance.now();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  frame = requestAnimationFrame(tick);
}

export async function closeGame(): Promise<void> {
  if (!root || !refs) return;

  cancelAnimationFrame(frame);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('resize', onResize);

  if (state && state.hi > savedHi) writeHiScore(state.hi);

  const { run } = await import('./transition');
  await run(refs.field.getBoundingClientRect(), 'out');

  root.remove();
  root = null;
  refs = null;
  state = null;

  document.body.style.overflow = '';
  window.scrollTo(0, restoreScroll);

  trigger?.removeAttribute('data-open');
  // preventScroll matters: focusing the trigger scrolls it back into view, which
  // lands the reader at the top of the page and undoes the restore above.
  trigger?.focus({ preventScroll: true });
  trigger = null;
}
