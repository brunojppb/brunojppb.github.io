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
 * size is the only thing being animated. At 520ms the source changes from the
 * rasterised page to the game's opening formation, and the climb back in
 * resolution is then the same operation on a different picture. That reversal is
 * the whole idea: it is why the invaders look like they were in the page all
 * along, and it is not a fade.
 */

const IN_MS = 720;
const OUT_MS = 480;

/** Time in milliseconds against block size in pixels, straight from the handoff. */
const KEYFRAMES: readonly [number, number][] = [
  [0, 1],
  [160, 6],
  [380, 20],
  [520, 40],
  [650, 8],
  [720, 1],
];

/** Where the source stops being the page and starts being the game. */
const SWITCH_MS = 520;
const VEIL_FROM_MS = 380;
const VEIL_UNTIL_MS = 650;
const VEIL_PEAK = 0.7;
const ARRIVE_MS = 650;

const FIELD_COLOUR = '#0b0b10';

let pageCanvas: HTMLCanvasElement | null = null;
let pending: Promise<HTMLCanvasElement> | null = null;
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

/** The game's opening formation, drawn where the real field is about to be. */
function formationCanvas(field: DOMRect, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = FIELD_COLOUR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  const game = formationCanvas(field, w, h);
  const canvas = document.createElement('canvas');
  canvas.dataset.invadersCanvas = '';
  canvas.width = w;
  canvas.height = h;
  canvas.style.cssText = `position:fixed;inset:0;width:100%;height:100%;z-index:60;pointer-events:none`;
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

  const total = direction === 'in' ? IN_MS : OUT_MS;
  const start = performance.now();

  await new Promise<void>((resolve) => {
    function frame(now: number): void {
      const elapsed = Math.min(total, now - start);
      // The exit is the same curve, played backwards and compressed.
      const t = direction === 'in' ? elapsed : IN_MS * (1 - elapsed / total);

      const block = Math.max(1, blockAt(t));
      // Both directions read the same curve, so `t` already carries the direction.
      const source = t < SWITCH_MS ? page : game;

      const sw = Math.max(1, Math.round(w / block));
      const sh = Math.max(1, Math.round(h / block));
      small.width = sw;
      small.height = sh;
      smallCtx.drawImage(source, 0, 0, sw, sh);

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

      // The canvas comes down here too, not just at the end: the HUD and
      // footer slide into view over the 70ms after this, on the real DOM, and
      // that motion would be invisible under a canvas that outlives it.
      if (direction === 'in' && elapsed >= ARRIVE_MS) {
        root?.removeAttribute('data-arriving');
        canvas.remove();
      }

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
