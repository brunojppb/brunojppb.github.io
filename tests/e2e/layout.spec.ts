import { test, expect } from '@playwright/test';

const ROUTES = [
  '/probe/',
  '/gallery/',
  '/entries/distributed-lock-in-node-js/', // 25k, the longest
  '/entries/modern-webapps-with-elixir-phoenix-typescript-react/', // 23k
  '/entries/https-for-your-homelab/', // 20k
  '/',
  '/posts/',
  '/tags/leadership/',
  '/about/',
  '/courses/',
  '/reading/',
  '/404',
];

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

test('courses stat-strip numbers do not clip at 390', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  await page.goto('/courses/');
  await page.evaluate(() => document.fonts.ready);
  // A cell's number can be wider than its own box without growing
  // document.scrollWidth, so this checks each stat cell's own
  // scrollWidth against its clientWidth, not page-level overflow.
  const cells = await page.locator('.grid.grid-cols-3 > div > div:first-child').evaluateAll(
    (els) => els.map((e) => ({ scrollWidth: e.scrollWidth, clientWidth: e.clientWidth }))
  );
  expect(cells.length).toBe(3);
  for (const cell of cells) expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
});

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

test('chrome dots are square, and the count matches the breakpoint', async ({ page }, testInfo) => {
  await page.goto('/probe/');
  const dots = page.locator('[data-chrome-dot]');
  const results = await dots.evaluateAll((els) =>
    els
      .map((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return { hidden: style.display === 'none', width: box.width, height: box.height, radius: style.borderRadius };
      })
      .filter((d) => !d.hidden)
  );

  const expectedCount = testInfo.project.name === 'mobile' ? 2 : 3;
  expect(results.length).toBe(expectedCount);

  for (const dot of results) {
    expect(dot.width).toBeCloseTo(dot.height, 0);
    expect(dot.radius).toBe('0px');
  }
});
