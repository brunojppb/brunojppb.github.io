import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { parse } from 'yaml';

// The compact list on /src/ is whatever projects.yaml does not pin, so the
// count comes from the same file the page builds from. Hard-coding it means
// every repo added or pinned breaks this test for no real reason.
const COMPACT_REPO_COUNT = (
  parse(readFileSync('src/data/projects.yaml', 'utf-8')) as { pinned: boolean }[]
).filter((p) => !p.pinned).length;

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

test('/src/ compact repo rows are at least 44px tall at 390', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  await page.goto('/src/');
  const heights = await page.locator('[data-repo-row]').evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height)
  );
  // Asserted first, and exact, so a selector typo (matching zero rows)
  // fails loudly here instead of passing the height loop vacuously.
  // Guards the guard: a count of zero would make the line below vacuous too.
  expect(COMPACT_REPO_COUNT).toBeGreaterThan(0);
  expect(heights.length).toBe(COMPACT_REPO_COUNT);
  for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
});
