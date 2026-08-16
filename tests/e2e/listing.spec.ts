import { test, expect } from '@playwright/test';

test('the home page shows between three and five posts', async ({ page }) => {
  await page.goto('/');
  const rows = await page.locator('[data-filerow]').count();
  expect(rows).toBeGreaterThanOrEqual(3);
  expect(rows).toBeLessThanOrEqual(5);
});

test('the archive lists all 30 posts', async ({ page }) => {
  await page.goto('/posts/');
  expect(await page.locator('[data-filerow]').count()).toBe(30);
});

test('year groups run newest first', async ({ page }) => {
  await page.goto('/posts/');
  const years = await page.locator('[data-year]').allInnerTexts();
  const nums = years.map((y) => Number(y.replace(/\D/g, '')));
  expect(nums).toEqual([...nums].sort((a, b) => b - a));
});

test('tag counts on the archive match the tag page', async ({ page }) => {
  await page.goto('/posts/');
  const chips = await page.locator('[data-tag]').evaluateAll((els) =>
    els.map((e) => ({
      href: (e as HTMLAnchorElement).getAttribute('href'),
      count: Number((e.textContent ?? '').replace(/\D/g, '')),
    }))
  );
  expect(chips.length).toBe(14);
  for (const chip of chips) {
    await page.goto(chip.href!);
    const rows = await page.locator('[data-filerow]').count();
    expect(rows, `${chip.href} count mismatch`).toBe(chip.count);
  }
});

test('rows are at least 44px tall at 390', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  await page.goto('/posts/');
  // data-filerow sits on the row's own <a> (the whole row is the link),
  // not on a wrapper around one — `[data-filerow] a` matches zero nested
  // anchors, which would fail the length assertion below rather than
  // pass vacuously. Targets the row itself instead.
  const heights = await page.locator('[data-filerow]').evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height)
  );
  expect(heights.length).toBeGreaterThan(0);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
});
