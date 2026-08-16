import { test, expect } from '@playwright/test';

const BANNED = ['●', '▶', '▚', '✓', '★', '⧉', '≡', '✕', '⚠'];

const ROUTES = ['/gallery/', '/about/', '/courses/', '/404', '/system/'];

// `/system/`'s glyph section deliberately renders the banned set — that's the
// whole point of the section, showing readers which glyphs fall back. It
// marks that one demonstration string with `data-glyph-fallback` so the
// audit below can drop just that text before scanning, rather than skipping
// the route (which would stop auditing everything else on the page) or
// weakening the checks for every other route.
//
// The exemption is a hole in the audit, so it carries its own guard rather
// than trusting whoever edits the markup next to keep it narrow: at most one
// exempted element per page, and short enough that it can only be a
// demonstration string, not a section someone tagged to dodge the audit. A
// comment asks nicely; this throws.
const MAX_EXEMPT_CHARS = 40;

async function stripGlyphFallbackDemo(page: import('@playwright/test').Page) {
  const exempted = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-glyph-fallback]')];
    const info = els.map((el) => (el.textContent ?? '').trim());
    els.forEach((el) => el.remove());
    return info;
  });

  if (exempted.length > 1) {
    throw new Error(
      `[data-glyph-fallback] must exempt at most one element per page, found ${exempted.length}`
    );
  }
  for (const text of exempted) {
    if (text.length > MAX_EXEMPT_CHARS) {
      throw new Error(
        `[data-glyph-fallback] exemption is ${text.length} characters — too large to be a ` +
          `narrow demonstration (max ${MAX_EXEMPT_CHARS}): "${text.slice(0, 60)}…"`
      );
    }
  }
}

for (const route of ROUTES) {
  test(`${route}: every visible glyph comes from Departure Mono`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await stripGlyphFallbackDemo(page);

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
    await stripGlyphFallbackDemo(page);
    const text = await page.locator('body').innerText();
    const found = BANNED.filter((g) => text.includes(g));
    expect(found, `banned glyphs present: ${found.join(' ')}`).toEqual([]);
  });
}
