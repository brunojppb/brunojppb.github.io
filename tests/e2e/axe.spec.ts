import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { ROUTES } from './routes';

/**
 * Runs the axe engine over every template and fails on any WCAG 2.1 A/AA
 * violation.
 *
 * This is the same engine behind Lighthouse's accessibility score, so a run
 * here reproduces the report that sent us looking in the first place. It exists
 * because the code comment colour drifted under 4.5:1 and nothing in the suite
 * noticed: `tests/unit/contrast.test.ts` checks the `contrastRatio` function
 * against hex literals typed into the test, so editing a token cannot fail it,
 * and `a11y.spec.ts` never looked at colour at all.
 *
 * This runs in the `desktop` and `mobile` projects only, because `tablet` and
 * `laptop` name their files with `testMatch` and do not name this one. The
 * rules here are about colour and semantics rather than layout, so the two
 * intermediate widths would only repeat the same findings.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Violations that are real, understood, and waiting on a decision rather than
 * on a fix. Listing a rule here still reports it: the test below prints what
 * each exception is currently suppressing, so an entry cannot rot into silence.
 * Empty is the goal, and it is currently empty.
 */
const KNOWN: Record<string, string> = {};

for (const route of ROUTES) {
  test(`axe reports no WCAG A/AA violations: ${route}`, async ({ page }) => {
    await page.goto(route);
    // Contrast is measured against rendered glyphs, so the webfont has to have
    // landed. Without this the first routes race the font swap.
    await page.evaluate(() => document.fonts.ready);

    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();

    const [known, unexpected] = [
      violations.filter((v) => v.id in KNOWN),
      violations.filter((v) => !(v.id in KNOWN)),
    ];

    for (const v of known) {
      console.log(`  known: ${v.id} x${v.nodes.length} on ${route}: ${KNOWN[v.id]}`);
    }

    expect(
      unexpected.map((v) => ({
        rule: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target, why: n.failureSummary })),
      }))
    ).toEqual([]);
  });
}

/**
 * The regression this suite was built for, pinned to the exact pair that broke.
 * The sweep above would catch it too, but only as one entry in a list of
 * hundreds of nodes. This one names the colours, so a failure here says which
 * token moved instead of leaving someone to read a stack of selectors.
 */
test('code comments clear 4.5:1 against the code surface', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'a colour check; one project is enough');

  await page.goto('/entries/https-for-your-homelab/');
  await page.evaluate(() => document.fonts.ready);

  const { violations } = await new AxeBuilder({ page })
    .include('pre')
    .withRules(['color-contrast'])
    .analyze();

  expect(violations.flatMap((v) => v.nodes).map((n) => n.failureSummary)).toEqual([]);
});
