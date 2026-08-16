import { test, expect } from '@playwright/test';

const ROUTES = ['/probe/'];

for (const route of ROUTES) {
  test(`${route}: no horizontal overflow`, async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflows).toBe(false);
  });
}

test('all six destinations are reachable at 390', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  await page.goto('/probe/');
  const hrefs = await page.locator('[data-tabbar] a').evaluateAll((els) =>
    els.map((e) => (e as HTMLAnchorElement).getAttribute('href'))
  );
  expect(hrefs).toEqual(['/posts/', '/about/', '/src/', '/reading/', '/courses/', '/system/']);
});

test('the tab strip scrolls rather than truncating', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  await page.goto('/probe/');
  const strip = page.locator('[data-tabbar]');
  const { scrollW, clientW } = await strip.evaluate((el) => ({
    scrollW: el.scrollWidth, clientW: el.clientWidth,
  }));
  expect(scrollW).toBeGreaterThan(clientW);
  // Every label is fully rendered, none clipped to an ellipsis.
  const texts = await strip.locator('a').allInnerTexts();
  expect(texts.some((t) => t.includes('…'))).toBe(false);
});

test('chrome dots are square', async ({ page }) => {
  await page.goto('/probe/');
  const box = await page.locator('[data-chrome-dot]').first().boundingBox();
  expect(box!.width).toBeCloseTo(box!.height, 0);
  const radius = await page.locator('[data-chrome-dot]').first()
    .evaluate((el) => getComputedStyle(el).borderRadius);
  expect(radius).toBe('0px');
});
