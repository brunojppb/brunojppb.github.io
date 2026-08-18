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
