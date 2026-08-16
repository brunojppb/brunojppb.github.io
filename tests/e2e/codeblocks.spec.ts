import { test, expect } from '@playwright/test';

/**
 * `/system/` covers CodeBlock.astro directly (the design-system page's own
 * specimens). The other two are the real post route
 * (`src/pages/entries/[slug].astro`), so the audit checks the same rehype
 * pipeline (src/lib/rehype-code-block.ts) a reader of a real post actually
 * gets, not just the component specimens.
 */
const ROUTES = [
  '/system/',
  '/entries/distributed-lock-in-node-js/', // 16 fences
  '/entries/https-for-your-homelab/', // 19 fences
];

for (const route of ROUTES) {
  test(`${route}: each source line is its own block element`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    // Lines live inside <code>, not as direct children of <pre> — a <pre>
    // wraps a single <code>, matching the semantic pairing Shiki emits.
    //
    // Ground truth comes from the block's own [data-copy] button, which
    // carries the raw, pre-render source in data-code (see CopyButton.tsx
    // and rehype-code-block.ts). Comparing rendered output against a
    // DOM-derived number — line count vs. baseline count, both read off
    // the same render — would agree trivially if the render itself emitted
    // too few blocks; comparing against the untouched source is the only
    // check that actually catches that.
    const blocks = await page.locator('pre:not([data-ascii])').evaluateAll((pres) =>
      pres.map((p) => {
        const container = p.querySelector('code') ?? p;
        const button = p.closest('figure')?.querySelector('[data-copy]');
        const rawCode = button?.getAttribute('data-code');
        if (rawCode == null) {
          throw new Error('code block has no [data-copy][data-code] to derive ground truth from');
        }
        const expectedLines = rawCode.replace(/\n$/, '').split('\n').length;
        return {
          expectedLines,
          renderedLines: container.children.length,
          distinctBaselines: new Set(
            [...container.children].map((c) => Math.round(c.getBoundingClientRect().top))
          ).size,
        };
      })
    );

    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      // Catches a render that emits the wrong number of block elements —
      // e.g. two source lines merged into one div — even when whatever it
      // did emit is internally consistent (lines === baselines) and would
      // otherwise pass silently.
      expect(b.renderedLines, 'rendered block count does not match the source').toBe(b.expectedLines);
      // Catches the original fusion bug: right number of blocks, but laid
      // out inline so they share one baseline instead of stacking.
      expect(b.distinctBaselines, 'lines fused into one run').toBe(b.expectedLines);
    }
    // The route must actually exercise a multi-line block at least once —
    // the real corpus has genuine one-line fences ("sudo nano /etc/hosts")
    // — or the checks above would hold vacuously for every block.
    expect(blocks.some((b) => b.expectedLines > 1)).toBe(true);
  });
}

// A <pre> may scroll horizontally inside its own box — the corpus has a
// 334-character line — but the page itself must never scroll. That's
// covered separately, and strictly, by layout.spec.ts at every width.

test('the copy button copies a CodeBlock.astro snippet (React island)', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/system/');
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
  await page.goto('/entries/https-for-your-homelab/');
  const button = page.locator('[data-copy][data-copy-source]').first();
  await button.click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.length).toBeGreaterThan(0);
});
