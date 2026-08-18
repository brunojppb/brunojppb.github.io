import { test, expect } from '@playwright/test';

// `test.use({ reducedMotion: 'reduce' })` does not reach Chromium's CDP
// media emulation in this Playwright version (1.62.1) — `matchMedia`
// still reports `no-preference` and theme.css's override never fires.
// `page.emulateMedia()` sets the same feature and does work, so each test
// calls it directly before navigating.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('reduced motion stops the scanlines', async ({ page }) => {
  await page.goto('/');
  const duration = await page.locator('.scanlines').evaluate(
    (el) => getComputedStyle(el).animationDuration
  );
  expect(parseFloat(duration)).toBeLessThan(0.01);
});

test('reduced motion pins the caret visible', async ({ page }) => {
  // The home page carries more than one .caret now: the chrome bar holds a
  // hidden ./invaders hint caret that only shows once the game trigger is
  // hovered. This test cares about the live prompt caret, so it selects a
  // visible one instead of the first in DOM order. A hidden specimen has
  // nothing for reduced motion to override.
  await page.goto('/');
  const caret = page.locator('.caret:visible').first();
  await expect(caret).toBeVisible();
  // `console-blink` is `1.1s steps(1) infinite`: opacity sits at 1 for the
  // first half of every cycle regardless of reduced motion, so reading
  // opacity alone passes about half the time by coincidence. duration is
  // a static computed-style property, not a snapshot mid-animation — it
  // can only read near-zero if theme.css's reduced-motion override
  // actually applied.
  const duration = await caret.evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.01);
  expect(await caret.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});
