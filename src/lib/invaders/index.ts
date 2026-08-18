import { DESKTOP_QUERY } from './rules';

/**
 * The only part of the game that loads on every page: a media query, two
 * listeners, and a dynamic import. The state machine, the view and the
 * rasteriser all sit behind that import, so a reader who never opens the game
 * downloads none of them.
 */

const SEQUENCE = 'inv';
/** The sequence is undocumented, so it resets quickly rather than lingering. */
const SEQUENCE_IDLE_MS = 1000;

let typed = '';
let lastKeyAt = 0;

/**
 * Read live rather than cached, so a reader who resizes past the trigger's
 * breakpoint gets a working listener behind it, not a button with nothing
 * wired to it.
 */
function desktop(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** True when the keystroke belongs to whatever the reader is typing in. */
function inField(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable]') !== null
  );
}

/** True while any modal owns the keyboard, the palette included. */
function modalOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

async function launch(): Promise<void> {
  try {
    const { openGame } = await import('./game');
    await openGame();
  } catch (error) {
    // A chunk that will not load is not worth breaking the page over. The reader
    // came here to read, so leave everything exactly as they found it.
    console.warn('invaders: could not start', error);
  }
}

export function install(): void {
  document.addEventListener('click', (event) => {
    if (!desktop()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('[data-invaders-open]')) return;
    void launch();
  });

  // Warms the rasteriser before the click, so the click itself feels instant.
  document.addEventListener(
    'pointerenter',
    (event) => {
      if (!desktop()) return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-invaders-open]')) return;
      // A failed prefetch is only a missed warm-up, never worth surfacing.
      void import('./transition')
        .then((mod) => mod.prepare())
        .catch(() => {});
    },
    true
  );

  window.addEventListener('keydown', (event) => {
    if (!desktop()) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (inField(event.target) || modalOpen()) return;

    const now = event.timeStamp;
    if (now - lastKeyAt > SEQUENCE_IDLE_MS) typed = '';
    lastKeyAt = now;

    typed = (typed + event.key.toLowerCase()).slice(-SEQUENCE.length);
    if (typed !== SEQUENCE) return;

    typed = '';
    void launch();
  });
}
