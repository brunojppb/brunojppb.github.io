import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { BEAT_START } from '../../src/lib/invaders/rules';

/** The trigger exists above 900px on a fine pointer, and nowhere else. */
function isDesktop(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) >= 900;
}

test.describe('the trigger', () => {
  test('is a button above 900px, and an inert square below', async ({ page }) => {
    await page.goto('/posts/');
    const button = page.locator('[data-invaders-open]');

    if (isDesktop(page)) {
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-label', 'Play invaders');
    } else {
      await expect(button).toHaveCount(1);
      await expect(button).toBeHidden();
    }
  });

  test('keeps the chrome dot count and the 9px square', async ({ page }) => {
    // The button replaces one dot rather than adding one. If both the button and
    // the inert span showed, the chrome title would shift and layout.spec.ts
    // would count four.
    await page.goto('/posts/');
    const visible = await page.locator('[data-chrome-dot]').evaluateAll((els) =>
      els
        .filter((el) => getComputedStyle(el).display !== 'none')
        .map((el) => el.getBoundingClientRect().width)
    );
    const expected = (page.viewportSize()?.width ?? 0) >= 640 ? 3 : 2;
    expect(visible).toHaveLength(expected);
    for (const width of visible) expect(width).toBeLessThanOrEqual(9);
  });

  test('gives no hint at all until it is hovered', async ({ page }) => {
    test.skip(!isDesktop(page), 'the trigger does not exist below 900px');
    await page.goto('/posts/');

    await expect(page.locator('[data-invaders-hint]')).toBeHidden();
    await expect(page.locator('[data-chrome-meta]')).toBeVisible();
    // No tooltip, and no cursor change on the bar as a whole.
    await expect(page.locator('[data-invaders-open]')).not.toHaveAttribute('title', /./);
  });

  test('swaps the chrome meta for ./invaders on hover', async ({ page }) => {
    test.skip(!isDesktop(page), 'the trigger does not exist below 900px');
    await page.goto('/posts/');

    await page.locator('[data-invaders-open]').hover();

    const hint = page.locator('[data-invaders-hint]');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('./invaders');
    await expect(page.locator('[data-chrome-meta]')).toBeHidden();
  });

  test('has a 24px hit area without a 24px box', async ({ page }) => {
    test.skip(!isDesktop(page), 'the trigger does not exist below 900px');
    await page.goto('/posts/');

    const box = await page.locator('[data-invaders-open]').evaluate((el) => {
      const own = el.getBoundingClientRect();
      const after = getComputedStyle(el, '::after');
      return { w: own.width, h: own.height, inset: after.inset };
    });

    expect(box.w).toBeCloseTo(9, 1);
    expect(box.h).toBeCloseTo(9, 1);
    expect(box.inset).toContain('-7.5px');
  });

  test('is reachable by Tab', async ({ page }) => {
    test.skip(!isDesktop(page), 'the trigger does not exist below 900px');
    await page.goto('/posts/');

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const onTrigger = await page.evaluate(
        () => document.activeElement?.hasAttribute('data-invaders-open') === true
      );
      if (onTrigger) {
        await expect(page.locator('[data-invaders-hint]')).toBeVisible();
        return;
      }
    }
    throw new Error('Tab never reached the trigger in 12 stops');
  });

  test('leaves only one caret animating at rest', async ({ page }) => {
    await page.goto('/posts/');
    const animating = await page
      .locator('.caret')
      .evaluateAll((els) => els.filter((el) => getComputedStyle(el).animationName !== 'none').length);
    expect(animating).toBeLessThanOrEqual(1);
  });
});

test.describe('on a coarse pointer', () => {
  // Width alone does not prove the pointer gate. Chromium reports
  // `pointer: coarse` only under mobile emulation, so this block asks for a
  // touch context at a desktop width.
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 1200, height: 800 } });

  test('the trigger is absent even at 1200px', async ({ page }) => {
    await page.goto('/posts/');
    await expect(page.locator('[data-invaders-open]')).toBeHidden();
    // Four `[data-chrome-dot]` elements exist in DOM order now: two inert
    // squares, the button (index 2, hidden here), then the accent span that
    // takes its place. Index 3, not 2, is the one still on screen.
    await expect(page.locator('[data-chrome-dot]').nth(3)).toBeVisible();
  });
});

test.describe('opening and closing', () => {
  // The condition has to run inside a test, not at describe level: Playwright
  // evaluates a describe-level skip before the page fixture exists.
  test.beforeEach(async ({ page }) => {
    test.skip(!isDesktop(page), 'the game is desktop only');
  });

  test('the dot opens the game window', async ({ page }) => {
    await page.goto('/posts/');
    await page.locator('[data-invaders-open]').click();

    const root = page.locator('[data-invaders-root]');
    await expect(root).toBeVisible();
    await expect(root).toContainText('~/invaders');
    await expect(root).toContainText('ESC EXIT');
  });

  test('holds the trigger dot white while the game is open', async ({ page }) => {
    await page.goto('/posts/');
    await page.locator('[data-invaders-open]').click();
    await expect(page.locator('[data-invaders-open]')).toHaveAttribute('data-open', '');
  });

  test('typing i n v opens it too', async ({ page }) => {
    await page.goto('/posts/');
    await page.keyboard.press('i');
    await page.keyboard.press('n');
    await page.keyboard.press('v');
    await expect(page.locator('[data-invaders-root]')).toBeVisible();
  });

  test('i n v is ignored while the palette has focus', async ({ page }) => {
    await page.goto('/posts/');
    // The palette island hydrates on idle; nothing answers Meta+K until it
    // has. palette.spec.ts's own `load` helper waits on the same signal.
    await page.waitForSelector('astro-island[component-url*="CommandPalette"]:not([ssr])', {
      state: 'attached',
    });
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toBeVisible();

    await page.keyboard.type('inv');

    await expect(page.locator('[data-invaders-root]')).toHaveCount(0);
    // The letters went where they were typed.
    await expect(page.locator('input[type="search"]')).toHaveValue('inv');
  });

  test('locks the page behind it, and does not shift it', async ({ page }) => {
    await page.goto('/posts/');
    const before = await page.evaluate(() => document.body.getBoundingClientRect().width);

    await page.locator('[data-invaders-open]').click();
    // openGame is behind a dynamic import; the click event fires before it
    // resolves, so the lock is not in place until the window is visible.
    await expect(page.locator('[data-invaders-root]')).toBeVisible();

    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
    expect(await page.evaluate(() => document.body.getBoundingClientRect().width)).toBe(before);
  });

  test('Esc restores the exact scroll position', async ({ page }) => {
    await page.goto('/entries/https-for-your-homelab/');
    await page.evaluate(() => window.scrollTo(0, 900));
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(0);

    // The trigger opens the game only where a real click can land, so at
    // this scroll depth it sits off screen. Clicking it here would make
    // Playwright's own scroll-into-view move the page before the click ever
    // fires, which is the thing this test is trying to rule out. The `i n v`
    // route reaches the same `openGame` without touching the scroll first.
    await page.keyboard.press('i');
    await page.keyboard.press('n');
    await page.keyboard.press('v');
    const root = page.locator('[data-invaders-root]');
    await expect(root).toBeVisible();
    // The design arms input at 720ms; Escape sent before that lands on
    // nothing, so the close half of this round trip goes untested.
    await expect(root).toHaveAttribute('data-armed', '');
    await page.keyboard.press('Escape');

    await expect(page.locator('[data-invaders-root]')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
  });

  test('never touches the URL', async ({ page }) => {
    await page.goto('/posts/');
    const url = page.url();
    const history = await page.evaluate(() => window.history.length);

    await page.locator('[data-invaders-open]').click();
    const root = page.locator('[data-invaders-root]');
    // Without this wait, Escape can land before input is armed at 720ms, so
    // the close half of this round trip goes untested.
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-armed', '');
    await page.keyboard.press('Escape');

    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => window.history.length)).toBe(history);
  });

  test('opens again cleanly after closing', async ({ page }) => {
    await page.goto('/posts/');
    const root = page.locator('[data-invaders-root]');

    await page.locator('[data-invaders-open]').click();
    await expect(root).toBeVisible();
    // The design arms input at 720ms; Escape sent before that lands on
    // nothing, so the game never closes and the reopen below has nothing to
    // reopen.
    await expect(root).toHaveAttribute('data-armed', '');
    await page.keyboard.press('Escape');
    await expect(root).toHaveCount(0);

    await page.locator('[data-invaders-open]').click();
    await expect(root).toHaveCount(1);
    await expect(page.locator('[data-invaders-open]')).toHaveAttribute('data-open', '');
  });

  test('hands focus back to the trigger on exit', async ({ page }) => {
    await page.goto('/posts/');
    await page.locator('[data-invaders-open]').click();
    const root = page.locator('[data-invaders-root]');
    await expect(root).toBeVisible();
    // The design arms input at 720ms; Escape sent before that lands on
    // nothing, so focus never moves and this assertion is really testing that
    // Escape did nothing rather than that it worked.
    await expect(root).toHaveAttribute('data-armed', '');
    await page.keyboard.press('Escape');
    // closeGame runs its own 480ms exit transition before it hands focus
    // back; checking activeElement before the window is gone would just be
    // reading the focus the opening click already left on the trigger.
    await expect(root).toHaveCount(0);
    expect(
      await page.evaluate(() => document.activeElement?.hasAttribute('data-invaders-open') === true)
    ).toBe(true);
  });
});

/**
 * Opens the game and waits for the font, which every measurement depends on, and
 * for input to be armed.
 *
 * Waiting for `data-armed` rather than for the window to appear is what makes
 * these tests independent of the transition: the design arms input at 720ms, so a
 * keypress sent when the window first paints has nothing listening for it.
 */
async function openGame(page: Page) {
  await page.goto('/posts/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-invaders-open]').click();
  const root = page.locator('[data-invaders-root]');
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-armed', '');
}

test.describe('the game', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDesktop(page), 'the game is desktop only');
  });

  test('opens on the title screen, which is also the score table', async ({ page }) => {
    await openGame(page);
    const title = page.locator('[data-invaders-panel="title"]');
    await expect(title).toBeVisible();
    await expect(title).toContainText('INVADERS');
    await expect(title).toContainText('PRESS SPACE TO START');
    await expect(title).toContainText('ESC RETURNS YOU TO ~/POSTS');
    await expect(title).toContainText('= 30 PTS');
    await expect(title).toContainText('= 20 PTS');
    await expect(title).toContainText('= 10 PTS');
  });

  test('SPACE starts a wave of five ranks by nine', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');

    await expect(page.locator('[data-invaders-panel="title"]')).toBeHidden();
    await expect(page.locator('.invaders-invader[data-state="alive"]')).toHaveCount(45);
    await expect(page.locator('.invaders-bunker')).toHaveCount(4);
    await expect(page.locator('[data-invaders-footer="playing"]')).toBeVisible();
  });

  test('draws the HUD and three lives as cannons, not numerals', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');

    await expect(page.locator('[data-invaders-score]')).toHaveText('000000');
    await expect(page.locator('[data-invaders-wave]')).toHaveText('01');
    const lives = page.locator('[data-invaders-lives] pre');
    await expect(lives).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) await expect(lives.nth(i)).toBeVisible();
  });

  test('puts the ground rule 24px off the bottom of a 466px field', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');

    const geometry = await page.evaluate(() => {
      const field = document.querySelector('[data-invaders-field]')!.getBoundingClientRect();
      const ground = document.querySelector('[data-invaders-ground]')!.getBoundingClientRect();
      return { fieldH: field.height, gap: field.bottom - ground.bottom };
    });
    expect(geometry.fieldH).toBeCloseTo(466, 0);
    expect(geometry.gap).toBeCloseTo(24, 0);
  });

  test('the cannon moves, and stops at the wall', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');

    const x = () =>
      page.evaluate(
        () => document.querySelector('[data-invaders-player]')!.getBoundingClientRect().x
      );
    const from = await x();

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    expect(await x()).toBeGreaterThan(from);

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(2000);
    await page.keyboard.up('ArrowLeft');

    const field = await page.evaluate(
      () => document.querySelector('[data-invaders-field]')!.getBoundingClientRect().x
    );
    expect(await x()).toBeCloseTo(field, 0);
  });

  test('fires one shot', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');

    await page.keyboard.press('Space');
    await expect(page.locator('[data-invaders-shot]')).toBeVisible();
  });

  test('holding SPACE does not autofire', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');
    await page.keyboard.press('Space');

    // Playwright's keyboard.down does not emit repeat keydowns, so a held key
    // cannot reach the guard through the normal API. These synthetic events are
    // exactly what a held key produces in a browser.
    //
    // Position is no use as the signal either: the cannon starts centred under
    // an occupied column, so its shot hits the bottom rank 90ms after firing.
    // Score is the durable signal. The one real press above kills one invader
    // for 10 points. With the guard that is the only shot ever fired, because
    // every later event is a repeat. Without it the cannon re-arms the moment
    // each shot clears, which is about eleven shots a second, and it eats up
    // the centre column.
    await page.evaluate(async () => {
      for (let i = 0; i < 120; i += 1) {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true })
        );
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      }
    });

    const score = await page.evaluate(() =>
      Number(document.querySelector('[data-invaders-score]')?.textContent ?? '0')
    );
    expect(score).toBeLessThanOrEqual(10);
  });

  test('the invaders step rather than slide', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');

    const left = () =>
      page.evaluate(
        () =>
          new DOMMatrixReadOnly(
            getComputedStyle(document.querySelector('[data-invaders-formation]')!).transform
          ).m41
      );

    const first = await left();
    await page.waitForTimeout(1400);
    const later = await left();

    expect(later).toBeGreaterThan(first);
    // Two beats at 620ms is two glyph cells, about 16.5px. A tween would land
    // on any value in between; a discrete step lands on a multiple.
    const cell = 57.9 / 7;
    const steps = (later - first) / cell;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(0.01);
  });

  test('P pauses, dims the field, and swaps the footer', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');
    await page.keyboard.press('p');

    await expect(page.locator('[data-invaders-panel="paused"]')).toBeVisible();
    await expect(page.locator('[data-invaders-panel="paused"]')).toContainText('PAUSED');
    await expect(page.locator('[data-invaders-footer="paused"]')).toContainText('P RESUME');
    await expect(page.locator('[data-invaders-footer="playing"]')).toBeHidden();
    await expect(page.locator('[data-invaders-field]')).toHaveAttribute('data-dim', '');

    await page.keyboard.press('p');
    await expect(page.locator('[data-invaders-panel="paused"]')).toBeHidden();
  });

  test('Esc exits from the title screen and from play', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-invaders-root]')).toHaveCount(0);

    await page.locator('[data-invaders-open]').click();
    const root = page.locator('[data-invaders-root]');
    // Reopening bypasses the openGame helper, so it needs its own wait: Space
    // sent before 720ms would land before input is armed.
    await expect(root).toHaveAttribute('data-armed', '');
    await page.keyboard.press('Space');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-invaders-root]')).toHaveCount(0);
  });

  test('Esc exits from pause', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');
    await page.keyboard.press('p');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-invaders-root]')).toHaveCount(0);
  });
});

test.describe('the transition', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDesktop(page), 'the game is desktop only');
  });

  test('covers the page with a canvas and then takes it away', async ({ page }) => {
    await page.goto('/posts/');
    await page.evaluate(() => document.fonts.ready);

    await page.locator('[data-invaders-open]').hover();
    await page.locator('[data-invaders-open]').click();

    await expect(page.locator('[data-invaders-canvas]')).toBeVisible();
    await expect(page.locator('[data-invaders-canvas]')).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator('[data-invaders-root]')).toBeVisible();
  });

  test('leaves the page behind it exactly where it was', async ({ page }) => {
    await page.goto('/entries/https-for-your-homelab/');
    await page.evaluate(() => document.fonts.ready);
    const before = await page.evaluate(() => ({
      w: document.body.scrollWidth,
      h: document.body.scrollHeight,
    }));

    await page.locator('[data-invaders-open]').click();
    await expect(page.locator('[data-invaders-canvas]')).toBeVisible();
    await expect(page.locator('[data-invaders-canvas]')).toHaveCount(0, { timeout: 4000 });
    // The canvas comes down at 650ms, ahead of the 720ms mark where input
    // arms; without this wait Escape can land in that gap and do nothing.
    await expect(page.locator('[data-invaders-root]')).toHaveAttribute('data-armed', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-invaders-root]')).toHaveCount(0);

    expect(await page.evaluate(() => ({
      w: document.body.scrollWidth,
      h: document.body.scrollHeight,
    }))).toEqual(before);
  });

  test('runs no canvas at all under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/posts/');
    await page.evaluate(() => document.fonts.ready);

    await page.locator('[data-invaders-open]').click();

    // Straight to the game. A canvas would mean the pixelation ran anyway.
    await expect(page.locator('[data-invaders-root]')).toBeVisible();
    await expect(page.locator('[data-invaders-canvas]')).toHaveCount(0);
  });

  test('the game still runs under reduced motion, and the pulse does not', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/posts/');
    await page.locator('[data-invaders-open]').click();
    const root = page.locator('[data-invaders-root]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-armed', '');

    const pulse = await page
      .locator('.invaders-pulse')
      .evaluate((el) => getComputedStyle(el).animationDuration);
    expect(Number.parseFloat(pulse)).toBeLessThan(0.01);

    const scan = await page
      .locator('.invaders-scan')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(scan).toBe('none');

    await page.keyboard.press('Space');
    await expect(page.locator('.invaders-invader[data-state="alive"]')).toHaveCount(45);
  });
});

test.describe('the audits', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDesktop(page), 'the game is desktop only');
  });

  test('accent on the field is the player and nothing else', async ({ page }) => {
    // The one colour law. Break it and the field stops being readable at a
    // glance, which is the reason the invaders are ranked in ink steps at all.
    await openGame(page);
    await page.keyboard.press('Space');
    await expect(page.locator('.invaders-invader[data-state="alive"]')).toHaveCount(45);
    // Fire, so the shot is actually on the field when the audit runs. A hidden
    // shot would never be inspected, and a mis-coloured shot is a defect whether
    // or not it happens to be on screen at that instant.
    await page.keyboard.press('Space');
    await expect(page.locator('[data-invaders-shot]')).toBeVisible();

    const offenders = await page.evaluate(() => {
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent')
        .trim();
      const probe = document.createElement('span');
      probe.style.color = accent;
      document.body.append(probe);
      const target = getComputedStyle(probe).color;
      probe.remove();

      const field = document.querySelector('[data-invaders-field]');
      if (!field) return ['no field'];

      const found: string[] = [];
      for (const el of field.querySelectorAll<HTMLElement>('*')) {
        if (el.closest('[data-invaders-player]')) continue;
        // The panels are the only other things in the field allowed the accent:
        // GAME OVER is drawn in it deliberately.
        if (el.closest('[data-invaders-panel]')) continue;
        const style = getComputedStyle(el);
        if (style.color === target || style.backgroundColor === target) {
          found.push(`${el.tagName}.${el.className} ${style.color} / ${style.backgroundColor}`);
        }
      }
      return found;
    });

    expect(offenders).toEqual([]);
  });

  test('every sprite glyph comes from Departure Mono', async ({ page }) => {
    // The template hides the shell from glyphs.spec.ts on purpose, so the sprites
    // need their own run with the game actually on screen.
    await openGame(page);
    await page.keyboard.press('Space');
    await page.evaluate(() => document.fonts.ready);

    const fallbacks = await page.evaluate(() => {
      const probe = (ch: string) => {
        const span = document.createElement('span');
        span.style.cssText = 'font:100px "Departure Mono";position:absolute;visibility:hidden';
        span.textContent = ch;
        document.body.append(span);
        const width = span.getBoundingClientRect().width;
        span.remove();
        return width;
      };
      const m = probe('M');
      const root = document.querySelector<HTMLElement>('[data-invaders-root]');
      const used = [...new Set(root?.innerText ?? '')].filter((c) => c.trim());
      return used.filter((c) => Math.abs(probe(c) - m) > 0.5);
    });

    expect(fallbacks).toEqual([]);
  });

  test('the sprites use only a full block and a space', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');

    const chars = await page.evaluate(() => {
      const rows = document.querySelectorAll('.invaders-sprite div');
      return [...new Set([...rows].map((el) => el.textContent ?? '').join(''))].sort();
    });
    expect(chars).toEqual([' ', '█']);
  });

  test('every sprite is one block element per row', async ({ page }) => {
    // Newlines between inline elements are not reliable. The failure is silent:
    // the rows fuse into one run and the sprite becomes a smear.
    await openGame(page);
    await page.keyboard.press('Space');

    const shapes = await page.evaluate(() =>
      [...document.querySelectorAll('.invaders-sprite')].map((pre) => ({
        rows: pre.children.length,
        blocks: [...pre.children].every((child) => getComputedStyle(child).display === 'block'),
      }))
    );

    expect(shapes.length).toBeGreaterThan(45);
    for (const shape of shapes) {
      expect(shape.rows).toBeGreaterThanOrEqual(4);
      expect(shape.blocks).toBe(true);
    }
  });

  test('reads the hi score back from one namespaced key', async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem('bpaulino:invaders:hi', '4820')
    );
    await openGame(page);
    await expect(page.locator('[data-invaders-hi]')).toHaveText('004820');

    await page.keyboard.press('Escape');
    const keys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(keys.filter((key) => key.includes('invaders'))).toEqual(['bpaulino:invaders:hi']);
  });

  test('the design token and the runtime beat agree', async ({ page }) => {
    // --game-beat is the design system's record of the beat, and rules.ts is what
    // the loop reads. Nothing forces them to match, so this does.
    await openGame(page);
    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--game-beat').trim()
    );
    // The build minifies 620ms to .62s, so compare durations rather than strings.
    const ms = token.endsWith('ms') ? Number.parseFloat(token) : Number.parseFloat(token) * 1000;
    expect(ms).toBe(BEAT_START);
  });

  test('the field takes its surface from --game-field', async ({ page }) => {
    await openGame(page);
    const field = await page
      .locator('[data-invaders-field]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(field).toBe('rgb(11, 11, 16)');
  });

  // Checks the rule shared by title, waveClear and gameOver, via the title panel,
  // which is reachable the instant the game opens. It does not reach game over
  // itself: that takes a real run to trigger in a browser.
  test('a panel covers the field rather than sitting over the invaders', async ({ page }) => {
    await openGame(page);
    const background = await page
      .locator('[data-invaders-panel="title"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe('rgb(11, 11, 16)');
  });

  test('opens and plays with no console error', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await openGame(page);
    await page.keyboard.press('Space');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1200);
    await page.keyboard.press('p');
    await page.keyboard.press('p');
    await page.keyboard.press('Escape');

    expect(errors).toEqual([]);
  });
});

test.describe('accessibility', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!isDesktop(page), 'the game is desktop only');
  });

  test('axe reports no WCAG A or AA violation with the game open', async ({ page }) => {
    await openGame(page);
    await page.keyboard.press('Space');
    await page.evaluate(() => document.fonts.ready);

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('is playable start to finish from the keyboard alone', async ({ page }) => {
    await page.goto('/posts/');
    await page.evaluate(() => document.fonts.ready);

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const onTrigger = await page.evaluate(
        () => document.activeElement?.hasAttribute('data-invaders-open') === true
      );
      if (onTrigger) break;
    }

    await page.keyboard.press('Enter');
    const root = page.locator('[data-invaders-root]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-armed', '');
    await page.keyboard.press('Space');
    await expect(page.locator('.invaders-invader[data-state="alive"]')).toHaveCount(45);
    await page.keyboard.press('Space');
    await expect(page.locator('[data-invaders-shot]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-invaders-root]')).toHaveCount(0);
  });
});
