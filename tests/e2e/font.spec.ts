import { test, expect } from '@playwright/test';

/** Width of a character rendered at 100px in the given font stack. */
async function advance(page: import('@playwright/test').Page, ch: string, family: string) {
  return page.evaluate(
    ({ c, f }) => {
      const s = document.createElement('span');
      s.style.cssText = `font:100px ${f};position:absolute;visibility:hidden`;
      s.textContent = c;
      document.body.append(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    },
    { c: ch, f: family }
  );
}

test('Departure Mono is loaded, not a fallback', async ({ page }) => {
  await page.goto('/system/');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  const mono = await advance(page, 'M', '"Departure Mono"');
  const fallback = await advance(page, 'M', 'monospace');

  // Departure Mono advances 0.6364em, so 63.64 at 100px. Chromium on Linux
  // rounds glyph advances to whole pixels and reports 64, so the band has to
  // be wider than that platform gap. It still excludes every stock monospace
  // (~60) and any proportional fallback (~83).
  expect(mono).toBeGreaterThan(62);
  expect(mono).toBeLessThan(65);

  // If the face had failed to load, the stack above would resolve to this.
  expect(Math.abs(mono - fallback)).toBeGreaterThan(1);
});

test('the font is served from this origin', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (r.resourceType() === 'font' && u.host !== 'localhost:4321') external.push(r.url());
  });
  await page.goto('/system/');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
});
