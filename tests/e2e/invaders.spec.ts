import { test, expect, type Page } from '@playwright/test';

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
    await expect(page.locator('[data-invaders-root]')).toBeVisible();
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
    await page.keyboard.press('Escape');

    expect(page.url()).toBe(url);
    expect(await page.evaluate(() => window.history.length)).toBe(history);
  });

  test('hands focus back to the trigger on exit', async ({ page }) => {
    await page.goto('/posts/');
    await page.locator('[data-invaders-open]').click();
    // openGame is behind a dynamic import; without this wait Escape can
    // race the import and land before the game (and its listener) exists.
    await expect(page.locator('[data-invaders-root]')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(() => document.activeElement?.hasAttribute('data-invaders-open') === true)
    ).toBe(true);
  });
});
