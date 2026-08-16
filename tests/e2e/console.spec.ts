import { test, expect } from '@playwright/test';

// Every distinct template on the site — nine real routes, no scratch pages
// (/probe/, /gallery/, /404) and no duplicate templates.
const ROUTES = [
  '/', '/posts/', '/entries/https-for-your-homelab/', '/about/', '/src/',
  '/reading/', '/courses/', '/system/', '/tags/leadership/',
];

for (const route of ROUTES) {
  test(`${route}: no console errors and no failed requests`, async ({ page }) => {
    const errors: string[] = [];
    const failed: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    expect(errors, errors.join('\n')).toEqual([]);
    expect(failed, failed.join('\n')).toEqual([]);
  });
}
