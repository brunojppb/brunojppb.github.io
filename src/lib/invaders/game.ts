import { HI_SCORE_KEY } from './rules';

/**
 * The game's lifecycle: mount the template, lock the page, hand back the exact
 * scroll position on the way out.
 */

let root: HTMLElement | null = null;
let trigger: HTMLElement | null = null;
let restoreScroll = 0;

export function readHiScore(): number {
  const raw = window.localStorage.getItem(HI_SCORE_KEY);
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function writeHiScore(hi: number): void {
  try {
    window.localStorage.setItem(HI_SCORE_KEY, String(hi));
  } catch {
    // Private browsing refuses the write. The run still counts, it just does
    // not outlive the tab, and losing a hi score is not worth an error.
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

function onKeyDown(event: KeyboardEvent): void {
  // The root claims aria-modal and nothing inside the window is focusable, so
  // Tab has nowhere to go. Without this it walks into the page behind the
  // overlay, which is still interactive.
  if (event.key === 'Tab') {
    event.preventDefault();
    return;
  }

  if (event.key !== 'Escape') return;
  event.preventDefault();
  closeGame();
}

export async function openGame(): Promise<void> {
  if (root) return;

  // Mount before anything else. Every line below changes the page, and mount can
  // throw: locking the scroll first would leave the reader stuck with no way back.
  const mounted = mount();

  trigger = document.querySelector<HTMLElement>('[data-invaders-open]');
  trigger?.setAttribute('data-open', '');
  restoreScroll = window.scrollY;
  document.body.style.overflow = 'hidden';

  root = mounted;
  root.focus();
  window.addEventListener('keydown', onKeyDown);
}

export function closeGame(): void {
  if (!root) return;

  window.removeEventListener('keydown', onKeyDown);
  root.remove();
  root = null;

  document.body.style.overflow = '';
  window.scrollTo(0, restoreScroll);

  trigger?.removeAttribute('data-open');
  // A plain focus() scrolls the trigger into view if it sits off screen,
  // which would undo the scrollTo above on a deep page.
  trigger?.focus({ preventScroll: true });
  trigger = null;
}
