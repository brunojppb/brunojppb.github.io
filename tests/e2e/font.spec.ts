import { test, expect } from '@playwright/test';

/** Width of a character rendered at 100px in Departure Mono. */
async function advance(page: import('@playwright/test').Page, ch: string) {
  return page.evaluate((c) => {
    const s = document.createElement('span');
    s.style.cssText = 'font:100px "Departure Mono";position:absolute;visibility:hidden';
    s.textContent = c;
    document.body.append(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return w;
  }, ch);
}

test('Departure Mono is loaded, not a fallback', async ({ page }) => {
  await page.goto('/probe/');
  await page.evaluate(() => document.fonts.ready);
  expect(await advance(page, 'M')).toBeCloseTo(63.64, 1);
});

test('the font is served from this origin', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (r.resourceType() === 'font' && u.host !== 'localhost:4321') external.push(r.url());
  });
  await page.goto('/probe/');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
});
