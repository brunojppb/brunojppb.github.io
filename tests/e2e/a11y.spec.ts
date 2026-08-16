import { test, expect } from '@playwright/test';

const POST = '/entries/https-for-your-homelab/';

test('the h1 is the post title, not the prompt line', async ({ page }) => {
  await page.goto(POST);
  const h1s = await page.getByRole('heading', { level: 1 }).allInnerTexts();
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toBe('HTTPS for your homelab, at local network speeds');
  expect(h1s[0]).not.toContain('$');
  expect(h1s[0]).not.toContain('cat ');
});

test('heading levels do not skip', async ({ page }) => {
  await page.goto(POST);
  const levels = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll((els) =>
    els.map((e) => Number(e.tagName[1]))
  );
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i] - levels[i - 1], `jump from h${levels[i - 1]} to h${levels[i]}`)
      .toBeLessThanOrEqual(1);
  }
});

test('prose caps at 68ch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop only');
  await page.goto(POST);
  await page.evaluate(() => document.fonts.ready);
  const width = await page.locator('[data-prose] p').first().evaluate((el) => el.clientWidth);
  const chWidth = await page.evaluate(() => {
    const s = document.createElement('span');
    s.style.cssText = 'font:16.5px "Departure Mono";position:absolute;visibility:hidden';
    s.textContent = '0';
    document.body.append(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return w;
  });
  expect(width / chWidth).toBeLessThanOrEqual(69);
});

test('the post is language-tagged', async ({ page }) => {
  await page.goto('/entries/7-scala-101-funcoes/');
  await expect(page.locator('article')).toHaveAttribute('lang', 'pt-BR');
});
