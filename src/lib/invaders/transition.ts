import {
  CELL_H,
  CELL_W,
  COLUMNS,
  COLUMN_PITCH,
  FORMATION_TOP,
  RANKS,
  RANK_PITCH,
  formationLeftFor,
} from './rules';
import { RANK_INK, RANK_SPRITE, SPRITE_COLS, gridCells } from './sprites';

/**
 * The page dissolving into its own pixels, and resolving back as the game.
 *
 * One canvas covers the frozen viewport. Each frame draws the source into a
 * small offscreen canvas and blows it back up with smoothing off, so the block
 * size is the only thing being animated. The climb back in resolution is the
 * same operation on a different picture. That reversal is the whole idea: it is
 * why the invaders look like they were in the page all along, and it is not a
 * fade.
 *
 * There are three sources, in this order. The rasterised page carries 0 to
 * 520ms. The hand-drawn formation carries the turn at 520ms, which is where the
 * invaders come out of the page's own pixels. From 520ms to 650ms it crosses to
 * a raster of the mounted game window, so the resolution the curve climbs back
 * to is the screen the reader actually gets. That third source is the whole
 * reason the hand-over is invisible: the formation alone is a picture the game
 * never draws, because on the title screen the panel covers the field.
 */

const IN_MS = 720;
const OUT_MS = 480;

/**
 * Time in milliseconds against block size in pixels.
 *
 * The handoff's table, with one change: it ends 650ms at 8px and 720ms at 1px,
 * and both are 24px here. Two separate measurements force it.
 *
 * A sprite cell is 8.27 by 9.36px, so a block of 8 redraws the invaders almost
 * exactly rather than coarsely.
 *
 * The game raster cannot be registered against the DOM any finer than about 20px.
 * html2canvas lays text out on its own line boxes and the error accumulates down
 * the page: 0px on the window frame, 6px on the HUD, 10px in the field, 7px on the
 * footer. Under half a block that error is invisible; over it, every line doubles.
 *
 * So the hand-over from 650ms to 720ms holds its block and cross-fades instead of
 * resolving. The sharp picture the reader ends on is the real DOM under the canvas,
 * which is what shows through as the canvas fades off it.
 */
const KEYFRAMES: readonly [number, number][] = [
  [0, 1],
  [160, 6],
  [380, 20],
  [520, 40],
  [650, 24],
  [720, 24],
];

/** Where the source stops being the page and starts being the game. */
const SWITCH_MS = 520;
const VEIL_FROM_MS = 380;
const VEIL_UNTIL_MS = 650;
const VEIL_PEAK = 0.7;
const ARRIVE_MS = 650;

/**
 * When the game raster starts, measured from the opening of the transition.
 *
 * The raster is mostly asynchronous but it holds the main thread for one stretch
 * of about 60ms, and that stretch lands roughly 80ms after the call. Starting
 * here puts it between 340ms and 410ms, the slowest part of the block curve,
 * where a few dropped frames do not read as a stutter. It also leaves the raster
 * finished well before 520ms, where it is first needed.
 */
const RASTER_GAME_AT_MS = 260;

const FIELD_COLOUR = '#0b0b10';

let pageCanvas: HTMLCanvasElement | null = null;
let pending: Promise<HTMLCanvasElement> | null = null;
let gameCanvas: HTMLCanvasElement | null = null;
let gamePending: Promise<HTMLCanvasElement> | null = null;
let listening = false;

function reduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Rasterises the viewport, cached.
 *
 * At CSS pixel scale rather than device pixel scale: the output is deliberately
 * pixelated, so device fidelity buys nothing and costs half the fill rate on the
 * only frames that are expensive, the first few at block 1 and 2.
 */
function rasterise(): Promise<HTMLCanvasElement> {
  if (pageCanvas) return Promise.resolve(pageCanvas);
  pending ??= import('html2canvas')
    .then(({ default: html2canvas }) =>
      html2canvas(document.body, {
        scale: 1,
        logging: false,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    )
    .then((canvas) => {
      pageCanvas = canvas;
      return canvas;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

export function invalidate(): void {
  pageCanvas = null;
  pending = null;
  invalidateGame();
}

/** The field's sprite layers, in the order the shell stacks them. */
const SPRITE_LAYERS = [
  '[data-invaders-formation]',
  '[data-invaders-bunkers]',
  '[data-invaders-bombs]',
  '[data-invaders-shot]',
  '[data-invaders-player]',
];

/** True while a panel covers the field, so nothing under it can show. */
function fieldCovered(): boolean {
  return ['title', 'waveClear', 'gameOver'].some(
    (name) =>
      document.querySelector<HTMLElement>(`[data-invaders-panel="${name}"]`)?.hidden === false
  );
}

/**
 * Rasterises the game window, cached.
 *
 * The target is the game root, not `document.body`. Rasterising the body costs
 * three times as much for the same picture, and it would also have to exclude our
 * own canvas, which is a sibling of the root. Rasterising the root excludes it for
 * free.
 *
 * `ignoreElements` drops the field's sprite layers whenever a panel covers the
 * field. That is 45 invaders of three `pre` each, so the clone is most of the cost:
 * dropping them takes the call from about 290ms to 120ms and its one long main
 * thread task from 190ms to 33ms. Under `paused` the field shows through, so the
 * layers stay and the call pays full price, which is free of consequence because
 * nothing is animating on a paused game.
 *
 * `onclone` edits the clone, never the page. It strips `data-arriving`, because the
 * HUD and the footer are still parked off the frame edges while this runs and the
 * raster has to show them where they finally sit.
 */
function rasteriseGame(root: HTMLElement): Promise<HTMLCanvasElement> {
  if (gameCanvas) return Promise.resolve(gameCanvas);
  const covered = fieldCovered();
  gamePending ??= import('html2canvas')
    .then(({ default: html2canvas }) =>
      html2canvas(root, {
        scale: 1,
        logging: false,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        width: window.innerWidth,
        height: window.innerHeight,
        ignoreElements: covered
          ? (element) => SPRITE_LAYERS.some((selector) => element.matches(selector))
          : undefined,
        onclone: (_document, element) => element.removeAttribute('data-arriving'),
      })
    )
    .then((canvas) => {
      gameCanvas = canvas;
      return canvas;
    })
    .catch((error) => {
      gamePending = null;
      throw error;
    });
  return gamePending;
}

/** Drops the game raster, because the screen it copied has changed. */
export function invalidateGame(): void {
  gameCanvas = null;
  gamePending = null;
}

/**
 * Takes the game raster now, for a screen that has stopped moving.
 *
 * The exit needs it the instant Escape lands, and it costs about 150ms, so it
 * cannot be taken on demand. Every phase but `playing` holds still, so the game
 * calls this on reaching one and the copy stays true until the phase changes.
 */
export function prepareGame(): void {
  if (reduced()) return;
  const root = document.querySelector<HTMLElement>('[data-invaders-root]');
  if (!root) return;
  void rasteriseGame(root).catch(() => undefined);
}

/** Warms the raster before the click, so the click itself feels instant. */
export function prepare(): void {
  if (reduced()) return;
  if (!listening) {
    listening = true;
    window.addEventListener('resize', invalidate);
    window.addEventListener('scroll', invalidate, { passive: true });
  }
  void rasterise().catch(() => undefined);
}

/**
 * The game's opening formation, drawn where the real field is about to be.
 *
 * It sits on the page raster rather than on a full bleed fill of the field
 * colour. The game keeps the page's window frame, border and chrome bar, so
 * blacking the whole viewport made 520ms read as the window vanishing. On the
 * page raster, 520ms changes the field and nothing else.
 */
function formationCanvas(
  page: HTMLCanvasElement,
  field: DOMRect,
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(page, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = FIELD_COLOUR;
  ctx.fillRect(field.left, field.top, field.width, field.height);

  const styles = getComputedStyle(document.documentElement);
  const cellW = CELL_W / SPRITE_COLS;
  const cellH = CELL_H / RANKS;
  const left = field.left + formationLeftFor(field.width);

  for (let rank = 0; rank < RANKS; rank += 1) {
    ctx.fillStyle = styles.getPropertyValue(RANK_INK[rank]).trim() || '#8b8799';
    const cells = gridCells(RANK_SPRITE[rank].a);
    for (let col = 0; col < COLUMNS; col += 1) {
      const originX = left + col * COLUMN_PITCH;
      const originY = field.top + FORMATION_TOP + rank * RANK_PITCH;
      for (let row = 0; row < cells.length; row += 1) {
        for (let cell = 0; cell < cells[row].length; cell += 1) {
          if (!cells[row][cell]) continue;
          ctx.fillRect(
            originX + cell * cellW,
            originY + row * cellH,
            Math.ceil(cellW),
            Math.ceil(cellH)
          );
        }
      }
    }
  }

  return canvas;
}

function ease(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
}

/** The block size at `t`, eased inside each segment so 520ms is a real turn. */
export function blockAt(t: number): number {
  for (let i = 1; i < KEYFRAMES.length; i += 1) {
    const [t0, b0] = KEYFRAMES[i - 1];
    const [t1, b1] = KEYFRAMES[i];
    if (t <= t1) return b0 + (b1 - b0) * ease((t - t0) / (t1 - t0));
  }
  return 1;
}

/**
 * How far the frame is lerped toward the field colour at `t`.
 *
 * The handoff builds this from 380ms and does not say it comes off again. It has
 * to: the invaders resolve out of the same pixels, and under a 70% veil they
 * would never appear.
 */
export function veilAt(t: number): number {
  if (t < VEIL_FROM_MS) return 0;
  if (t < SWITCH_MS) return (VEIL_PEAK * (t - VEIL_FROM_MS)) / (SWITCH_MS - VEIL_FROM_MS);
  if (t < VEIL_UNTIL_MS) return VEIL_PEAK * (1 - (t - SWITCH_MS) / (VEIL_UNTIL_MS - SWITCH_MS));
  return 0;
}

/**
 * How far the source has crossed from the formation to the real game screen.
 *
 * The formation is hand drawn, so it can only ever approximate what the reader
 * gets. On the title screen the panel covers the field, so the real screen has no
 * invaders on it at all. Crossing to a raster of the mounted window before the
 * blocks get fine enough to read is what keeps the hand-over off a picture the
 * game never draws. The cross-fade runs under the retreating veil, so the change
 * of source is never a cut.
 */
export function arriveAt(t: number): number {
  if (t <= SWITCH_MS) return 0;
  if (t >= ARRIVE_MS) return 1;
  return (t - SWITCH_MS) / (ARRIVE_MS - SWITCH_MS);
}

/**
 * The canvas's own opacity at `t`.
 *
 * The handoff hands the frame over between 650ms and 720ms rather than cutting:
 * the game DOM is already mounted underneath, and the HUD and footer slide in
 * from the frame edges over that same 70ms. A cut would end on one fully opaque
 * frame of a formation the game never draws, because the title panel covers the
 * field. Both directions read this, which is what gives the exit its fade in.
 */
export function fadeAt(t: number): number {
  if (t <= ARRIVE_MS) return 1;
  return Math.max(0, 1 - (t - ARRIVE_MS) / (IN_MS - ARRIVE_MS));
}

/**
 * Runs the pixelation. `in` dissolves the page into the game, `out` reverses it
 * over 480ms with the page as the destination.
 *
 * Resolves once the canvas is gone. Under reduced motion it resolves after a
 * 120ms crossfade and never makes a canvas at all.
 */
export async function run(field: DOMRect, direction: 'in' | 'out'): Promise<void> {
  const root = document.querySelector<HTMLElement>('[data-invaders-root]');

  if (reduced()) {
    if (root) {
      root.style.transition = 'opacity 120ms linear';
      root.style.opacity = direction === 'in' ? '0' : '1';
      // Forces the starting value to land before the target does.
      void root.offsetWidth;
      root.style.opacity = direction === 'in' ? '1' : '0';
    }
    await wait(120);
    if (root) {
      root.style.transition = '';
      root.style.opacity = '';
    }
    return;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const raster = await rasterise().catch(() => null);
  if (!raster) return;
  const page = raster;

  const formation = formationCanvas(page, field, w, h);
  const total = direction === 'in' ? IN_MS : OUT_MS;
  // The exit is the same curve, played backwards and compressed.
  const timeAt = (elapsed: number): number =>
    direction === 'in' ? elapsed : IN_MS * (1 - elapsed / total);

  const canvas = document.createElement('canvas');
  canvas.dataset.invadersCanvas = '';
  canvas.width = w;
  canvas.height = h;
  // The starting opacity is written here as well as per frame. The exit opens
  // part way through the hand-over, so the canvas must never reach the
  // compositor opaque before the first frame has drawn into it.
  canvas.style.cssText =
    `position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none;` +
    `opacity:${fadeAt(timeAt(0))}`;
  document.body.append(canvas);

  const rawCtx = canvas.getContext('2d');
  const small = document.createElement('canvas');
  const rawSmallCtx = small.getContext('2d');
  if (!rawCtx || !rawSmallCtx) {
    canvas.remove();
    return;
  }
  // Rebound so the nested frame closure below sees the narrowed, non-null
  // type rather than the getContext() result TypeScript cannot narrow across
  // a function boundary.
  const ctx = rawCtx;
  const smallCtx = rawSmallCtx;

  root?.setAttribute('data-arriving', '');

  const start = performance.now();
  let rastering = false;
  // `undefined` until the cross-fade opens and the decision is taken, then either
  // the raster to cross to or `null` for "run on the formation alone".
  let arrived: HTMLCanvasElement | null | undefined;

  await new Promise<void>((resolve) => {
    function frame(now: number): void {
      const elapsed = Math.min(total, now - start);
      const t = timeAt(elapsed);

      // Started here rather than at mount. The raster holds the main thread for
      // one stretch of about 60ms, and this is the slowest part of the curve.
      if (direction === 'in' && !rastering && elapsed >= RASTER_GAME_AT_MS) {
        rastering = true;
        prepareGame();
      }

      // Locked in when the cross-fade opens, so a raster that lands halfway
      // through cannot pop into the picture mid hand-over. The exit reads it on
      // its first frame, from the copy taken while the screen was still.
      if (arrived === undefined && t >= SWITCH_MS) arrived = gameCanvas;

      const block = Math.max(1, blockAt(t));

      const sw = Math.max(1, Math.round(w / block));
      const sh = Math.max(1, Math.round(h / block));
      small.width = sw;
      small.height = sh;

      // Both directions read the same curve, so `t` already carries the direction.
      if (t < SWITCH_MS) {
        smallCtx.drawImage(page, 0, 0, sw, sh);
      } else {
        smallCtx.drawImage(formation, 0, 0, sw, sh);
        const across = arrived ? arriveAt(t) : 0;
        if (across > 0 && arrived) {
          smallCtx.globalAlpha = across;
          smallCtx.drawImage(arrived, 0, 0, sw, sh);
          smallCtx.globalAlpha = 1;
        }
      }

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(small, 0, 0, sw, sh, 0, 0, w, h);

      const veil = veilAt(t);
      if (veil > 0) {
        ctx.globalAlpha = veil;
        ctx.fillStyle = FIELD_COLOUR;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // The canvas fades off the real DOM rather than being cut away from it.
      // `t` carries the direction, so the exit reads the same ramp backwards and
      // fades in over its first 70ms instead of opening on a sharp formation.
      canvas.style.opacity = String(fadeAt(t));

      // The HUD and footer slide into view over the same 70ms, under the fading
      // canvas. The exit keeps the attribute until the end, so they slide out.
      if (direction === 'in' && t >= ARRIVE_MS) root?.removeAttribute('data-arriving');

      if (elapsed >= total) {
        resolve();
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  canvas.remove();
  root?.removeAttribute('data-arriving');
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
