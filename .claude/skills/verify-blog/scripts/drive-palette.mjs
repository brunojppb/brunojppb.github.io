#!/usr/bin/env node
// Drives the ⌘K palette as a reader at 1440 and 390 wide.
// Usage: node scripts/drive-palette.mjs [query] [--miss]. --miss types `haskell`, which no post contains.
// Prints one JSON report. Saves screenshots and the report under runs/<stamp>/.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const here = dirname(fileURLToPath(import.meta.url));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = join(here, '..', 'runs', stamp);
mkdirSync(out, { recursive: true });

const args = process.argv.slice(2);
const miss = args.includes('--miss');
const query = miss ? 'haskell' : (args.find((a) => !a.startsWith('--')) ?? 'dev');

const browser = await chromium.launch();
const report = { base: BASE, query, out, widths: {} };
let failed = false;

for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const badResponses = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('response', (r) => r.status() >= 400 && badResponses.push(`${r.status()} ${r.url()}`));

  await page.goto(`${BASE}/posts/`);
  // A hydrated island drops its `ssr` attribute. Nothing listens for the key before that.
  await page.waitForSelector('astro-island[component-url*="CommandPalette"]:not([ssr])', { state: 'attached' });
  await page.evaluate(() => document.fonts.ready);

  await page.keyboard.press('Control+k');
  await page.locator('[role=dialog]').waitFor();
  await page.locator('[role=option]').first().waitFor();
  await page.screenshot({ path: join(out, `${width}-1-open.png`) });

  await page.locator('[role=combobox]').pressSequentially(query);
  if (miss) await page.getByText(/no matches in/).waitFor();
  else await page.locator('[role=group]').first().waitFor();
  // Results stay on screen until the next search lands. aria-busy clears when they match the input.
  await page.locator('[role=listbox]:not([aria-busy=true])').waitFor();

  const rows = await page.locator('[role=option]').allInnerTexts();
  const groups = await page.locator('[role=group]').evaluateAll((gs) =>
    gs.map((g) => ({
      label: g.getAttribute('aria-label'),
      rule: g.firstElementChild?.textContent ?? '',
      rows: g.querySelectorAll('[role=option]').length,
    })),
  );
  // The chrome count is hidden below 640px. The sr-only status carries it there.
  const chrome = await page.locator('[role=dialog] span[aria-hidden=true].ml-auto').innerText().catch(() => '');
  const announced = await page.locator('[role=status]').innerText();
  await page.screenshot({ path: join(out, `${width}-2-query.png`) });

  await page.keyboard.press('Escape');
  const closed = (await page.locator('[role=dialog]').count()) === 0;

  report.widths[width] = {
    rows: rows.map((r) => r.replace(/\s+/g, ' ').trim()),
    groups,
    chromeCount: chrome.replace(/\s+/g, ' ').trim(),
    announced,
    closedOnEscape: closed,
    consoleErrors,
    badResponses,
  };
  if (consoleErrors.length || badResponses.length || !closed) failed = true;
  if (!miss && rows.length === 0) failed = true;
  await context.close();
}

await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(failed ? 1 : 0);
