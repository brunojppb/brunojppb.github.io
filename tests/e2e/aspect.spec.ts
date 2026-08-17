import { test, expect } from '@playwright/test';

// Runs on WebKit only (the `safari` project in playwright.config.ts).
//
// A box that gets its height from `aspect-ratio` and its width from the
// grid track must not feed its own height back into that width. In WebKit
// the fed-back width is the border box, so every relayout adds the box's
// two border pixels and the picture grows without a limit — visible on an
// iPhone as an image that creeps past the window edge. Chromium keeps the
// box square and never shows it, so these cases only hold on WebKit.
//
// Each case names a page and the image inside the aspect box. The parent
// of that image is the box under test.
const CASES = [
  { route: '/about/', image: 'img[alt="Bruno Paulino smiling"]' },
  { route: '/courses/', image: 'img[alt$="thumbnail"]' },
];

for (const { route, image } of CASES) {
  test(`${route}: the aspect box holds its size across relayouts at 390`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    const box = page.locator(image).first().locator('xpath=..');
    const measure = async () => {
      const { width, height } = (await box.boundingBox()) ?? { width: 0, height: 0 };
      return { width: Math.round(width), height: Math.round(height) };
    };

    const before = await measure();
    expect(before.width).toBeGreaterThan(0);

    // One width change per pass is what an iPhone produces as the URL bar
    // moves. A stable box reads the same after twenty of them; a growing
    // one has gained forty pixels.
    for (let i = 0; i < 20; i++) {
      await page.setViewportSize({ width: 390 + (i % 2), height: 844 });
    }
    await page.setViewportSize({ width: 390, height: 844 });

    expect(await measure()).toEqual(before);
  });
}
