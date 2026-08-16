import { test, expect } from '@playwright/test';

// Same route list as layout.spec.ts's overflow sweep — every distinct
// template on the site, plus the two scratch routes.
const ROUTES = [
  '/probe/',
  '/gallery/',
  '/entries/distributed-lock-in-node-js/',
  '/entries/modern-webapps-with-elixir-phoenix-typescript-react/',
  '/entries/https-for-your-homelab/',
  '/',
  '/posts/',
  '/tags/leadership/',
  '/about/',
  '/courses/',
  '/reading/',
  '/src/',
  '/system/',
  '/404',
];

// §7.6: "Never more than one [caret] visible at a time." A `.caret` element
// can exist without animating (Caret's `animate={false}` renders a static
// specimen for geometry comparisons), so the rule is about ANIMATING
// carets specifically — `animationName` is how a size specimen and a live
// prompt caret tell apart, not just the presence of the `.caret` class.
for (const route of ROUTES) {
  test(`${route}: at most one caret is animating`, async ({ page }) => {
    await page.goto(route);
    const animating = await page.locator('.caret').evaluateAll(
      (els) => els.filter((el) => getComputedStyle(el).animationName !== 'none').length
    );
    expect(animating).toBeLessThanOrEqual(1);
  });
}
