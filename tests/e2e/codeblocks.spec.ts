import { test, expect } from '@playwright/test';

/**
 * `/gallery/` covers CodeBlock.astro directly. The other two are a real
 * post's markdown rendered through the rehype plugin (src/lib/rehype-code-
 * block.ts) — the post page itself doesn't exist until Task 7, so this is
 * a scratch route (src/pages/gallery/post/[slug].astro) that renders the
 * same content collection entry through the same pipeline. Auditing only
 * the gallery would prove nothing about what a reader of a real post gets;
 * that gap is exactly what broke this design once already.
 */
const ROUTES = [
  '/gallery/',
  '/gallery/post/distributed-lock-in-node-js/',
  '/gallery/post/https-for-your-homelab/',
];

for (const route of ROUTES) {
  test(`${route}: each source line is its own block element`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    // Lines live inside <code>, not as direct children of <pre> — a <pre>
    // wraps a single <code>, matching the semantic pairing Shiki emits.
    const blocks = await page.locator('pre:not([data-ascii])').evaluateAll((pres) =>
      pres.map((p) => {
        const container = p.querySelector('code') ?? p;
        return {
          lines: container.children.length,
          distinctBaselines: new Set(
            [...container.children].map((c) => Math.round(c.getBoundingClientRect().top))
          ).size,
        };
      })
    );

    expect(blocks.length).toBeGreaterThan(0);
    // The real corpus has genuine one-line fences ("sudo nano /etc/hosts") —
    // asserting every block has >1 line is a gallery-only assumption, the
    // same kind the dropped `overflows` check made. What must hold for
    // every block, one-line or not, is that its line count and its baseline
    // count agree — a collapse fuses N lines onto 1 baseline, which this
    // catches regardless of N.
    for (const b of blocks) {
      expect(b.distinctBaselines, 'lines fused into one run').toBe(b.lines);
    }
    // And the route must actually exercise a multi-line block at least
    // once, or the check above would pass vacuously.
    expect(blocks.some((b) => b.lines > 1)).toBe(true);
  });
}

// A <pre> may scroll horizontally inside its own box — the corpus has a
// 334-character line — but the page itself must never scroll. That's
// covered separately, and strictly, by layout.spec.ts at every width.

test('the copy button copies a CodeBlock.astro snippet (React island)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/gallery/');
  const button = page.locator('[data-copy]').first();
  await button.scrollIntoViewIfNeeded();
  // client:visible hydrates once the button crosses into the viewport —
  // scrolling starts that, but the module fetch + React hydrate that
  // follows isn't instant, so the first click or two can land before the
  // listener is attached. Retry the click until the clipboard picks it up.
  await expect(async () => {
    await button.click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied.length).toBeGreaterThan(0);
  }).toPass({ timeout: 5000 });
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('\n');
});

test('the copy button copies a markdown-derived block (rehype + static handler)', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/gallery/post/https-for-your-homelab/');
  const button = page.locator('[data-copy][data-copy-source]').first();
  await button.click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.length).toBeGreaterThan(0);
});
