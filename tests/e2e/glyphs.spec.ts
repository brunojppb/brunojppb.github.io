import { test, expect } from '@playwright/test';

const BANNED = ['●', '▶', '▚', '✓', '★', '⧉', '≡', '✕', '⚠'];

const ROUTES = ['/gallery/', '/about/', '/courses/', '/404'];

for (const route of ROUTES) {
  test(`${route}: every visible glyph comes from Departure Mono`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    const fallbacks = await page.evaluate(() => {
      const probe = (ch: string) => {
        const s = document.createElement('span');
        s.style.cssText = 'font:100px "Departure Mono";position:absolute;visibility:hidden';
        s.textContent = ch;
        document.body.append(s);
        const w = s.getBoundingClientRect().width;
        s.remove();
        return w;
      };
      const M = probe('M');
      const used = [...new Set(document.body.innerText)].filter((c) => c.trim());
      return used.filter((c) => Math.abs(probe(c) - M) > 0.5);
    });

    expect(fallbacks, `these fell back to a system font: ${fallbacks.join(' ')}`).toEqual([]);
  });

  test(`${route}: no banned glyph appears in the markup`, async ({ page }) => {
    await page.goto(route);
    const text = await page.locator('body').innerText();
    const found = BANNED.filter((g) => text.includes(g));
    expect(found, `banned glyphs present: ${found.join(' ')}`).toEqual([]);
  });
}
