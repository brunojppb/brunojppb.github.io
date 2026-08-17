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

test('JetBrains Mono is loaded, not a fallback', async ({ page }) => {
  await page.goto('/entries/12-dockerizing-react-apps/');
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  const jetbrains = await advance(page, 'M', '"JetBrains Mono"');
  const departure = await advance(page, 'M', '"Departure Mono"');

  // JetBrains Mono advances 0.6em, so 60 at 100px. The band excludes Departure
  // (~63.6) on one side and any proportional fallback (~83) on the other.
  expect(jetbrains).toBeGreaterThan(59);
  expect(jetbrains).toBeLessThan(61);

  // The prose stack lists Departure Mono as the first fallback, so a failed
  // load would land here rather than on a system face.
  expect(Math.abs(jetbrains - departure)).toBeGreaterThan(1);
});

test('the post body renders in JetBrains Mono and its headings stay in Departure', async ({ page }) => {
  await page.goto('/entries/12-dockerizing-react-apps/');
  await page.evaluate(() => document.fonts.ready);

  const used = (sel: string) =>
    page.locator(sel).first().evaluate((el) => getComputedStyle(el).fontFamily);

  expect(await used('[data-prose] p')).toContain('JetBrains Mono');
  expect(await used('[data-prose] pre')).toContain('JetBrains Mono');
  expect(await used('[data-prose] h2')).toContain('Departure Mono');
  expect(await used('[data-prose] h2')).not.toContain('JetBrains Mono');

  // The chrome around the article is untouched.
  expect(await used('h1')).not.toContain('JetBrains Mono');
});

// JetBrains Mono ships code ligatures. Left on, a code block draws `=>` as one
// arrow and `!=` as `≠`, which §11 bans and which is not what the file says.
test('code ligatures stay off, and the source survives to the clipboard', async ({ page }) => {
  await page.goto('/entries/retrying-api-calls-with-exponential-backoff/');
  await page.evaluate(() => document.fonts.ready);

  const pre = page.locator('[data-prose] pre').filter({ hasText: '=>' }).first();
  expect(await pre.evaluate((el) => getComputedStyle(el).fontVariantLigatures)).toBe('none');

  // The rendered text and the copy payload both keep the two characters.
  expect(await pre.innerText()).toContain('=>');
  const payload = await page
    .locator('[data-copy][data-copy-source]')
    .first()
    .evaluate((el) => (el as HTMLElement).dataset.code ?? '');
  expect(payload).toContain('=>');
});

test('the fonts are served from this origin', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (r.resourceType() === 'font' && u.host !== 'localhost:4321') external.push(r.url());
  });
  await page.goto('/system/');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
});
