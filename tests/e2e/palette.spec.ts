import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';

/**
 * The ⌘K palette. It is keyboard-first, so most of this drives the keyboard
 * and never touches the mouse. Runs in the `desktop` and `mobile` projects;
 * the checks that depend on width say so.
 */

const DESKTOP_ONLY = 'the palette is centred and 660px wide only above 640px';
const MOBILE_ONLY = 'full screen, and the visible trigger lives in the chrome bar';

function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 640;
}

/**
 * The island hydrates on idle, so nothing is bound to ⌘K until it has. A
 * hydrated `astro-island` drops its `ssr` attribute, which is the signal.
 */
async function load(page: Page) {
  await page.goto('/posts/');
  // `attached`, not the default `visible`: the island renders nothing until
  // it is opened, so the element has no box to be visible.
  await page.waitForSelector('astro-island[component-url*="CommandPalette"]:not([ssr])', {
    state: 'attached',
  });
  await page.evaluate(() => document.fonts.ready);
}

/** Opens the palette with ⌘K and waits for the index to land. */
async function open(page: Page, query?: string) {
  await load(page);
  await page.keyboard.press('Meta+k');
  await expect(page.locator('[role=dialog]')).toBeVisible();
  await expect(page.locator('[role=option]').first()).toBeVisible();
  if (query) {
    await page.locator('[role=combobox]').pressSequentially(query);
    await expect(page.locator('[role=option]').first()).toBeVisible();
  }
}

const selectedText = (page: Page) => page.locator('[role=option][aria-selected=true]').innerText();

test.describe('opening and closing', () => {
  test('⌘K opens with the input focused, and closes again', async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('combobox');
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[role=dialog]')).toHaveCount(0);
  });

  test('Ctrl+K opens too', async ({ page }) => {
    await load(page);
    await page.keyboard.press('Control+k');
    await expect(page.locator('[role=dialog]')).toBeVisible();
  });

  test('/ opens when focus is outside a field, and types itself when inside one', async ({ page }) => {
    await load(page);
    await page.keyboard.press('/');
    await expect(page.locator('[role=dialog]')).toBeVisible();
    await page.locator('[role=combobox]').pressSequentially('/');
    await expect(page.locator('[role=combobox]')).toHaveValue('/');
  });

  test('Escape closes and hands focus back to the trigger', async ({ page }) => {
    await load(page);
    const trigger = page.locator('[data-palette-open]:visible');
    await trigger.click();
    await expect(page.locator('[role=dialog]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[role=dialog]')).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-palette-open')))
      .toBe('');
  });

  test('Backspace on an empty query closes', async ({ page }) => {
    await open(page, 'dev');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await expect(page.locator('[role=dialog]')).toBeVisible();
    await page.keyboard.press('Backspace');
    await expect(page.locator('[role=dialog]')).toHaveCount(0);
  });

  test('a click on the dimmer closes', async ({ page }) => {
    test.skip(isMobile(page), MOBILE_ONLY);
    await open(page);
    await page.mouse.click(20, 20);
    await expect(page.locator('[role=dialog]')).toHaveCount(0);
  });
});

test.describe('the index', () => {
  // Against the built file, because the numbers are about real content: the
  // unit tests cover the transform, this covers what the build emitted.
  test('/search-index.json holds every post, tag and page, and stays small', async ({ request }) => {
    const response = await request.get('/search-index.json');
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.body();
    const entries = JSON.parse(body.toString());
    const count = (kind: string) => entries.filter((e: { kind: string }) => e.kind === kind).length;

    expect(count('post')).toBe(30);
    expect(count('tag')).toBe(14);
    expect(count('page')).toBe(6);
    for (const entry of entries) expect(entry).not.toHaveProperty('body');
    // The handoff's budget is 60 kB uncompressed. Without post bodies it is
    // nowhere near, and this fails long before the palette gets slow to open.
    expect(body.byteLength).toBeLessThan(20_000);
  });
});

test.describe('keyboard navigation', () => {
  test('the first result is selected on every keystroke', async ({ page }) => {
    await open(page, 'dev');
    const first = page.locator('[role=option]').first();
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'false');
    await page.locator('[role=combobox]').pressSequentially('o');
    await expect(page.locator('[role=option]').first()).toHaveAttribute('aria-selected', 'true');
  });

  test('arrows cross group boundaries: groups are visual, not navigational', async ({ page }) => {
    await open(page, 'dev');
    const groups = page.locator('[role=group]');
    await expect(groups).toHaveCount(2); // POSTS and TAGS
    const postCount = await groups.first().locator('[role=option]').count();
    for (let i = 0; i < postCount; i++) await page.keyboard.press('ArrowDown');
    await expect(groups.nth(1).locator('[role=option][aria-selected=true]')).toHaveCount(1);
  });

  test('arrows wrap at both ends', async ({ page }) => {
    await open(page, 'dev');
    const first = await selectedText(page);
    const total = await page.locator('[role=option]').count();
    for (let i = 0; i < total; i++) await page.keyboard.press('ArrowDown');
    expect(await selectedText(page)).toBe(first);
    await page.keyboard.press('ArrowUp');
    expect(await selectedText(page)).toBe(await page.locator('[role=option]').last().innerText());
  });

  test('Enter opens the selected result', async ({ page }) => {
    await open(page, 'homelab');
    const href = await page.locator('[role=option][aria-selected=true]').getAttribute('href');
    await page.keyboard.press('Enter');
    await page.waitForURL(`**${href}`);
    expect(new URL(page.url()).pathname).toBe(href);
  });

  test('Tab cycles the group filter instead of moving focus', async ({ page }) => {
    await open(page, 'dev');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('combobox');
    await expect(page.locator('[role=group]')).toHaveCount(1);
    await expect(page.locator('[role=group]')).toHaveAttribute('aria-label', 'POSTS');
    await page.keyboard.press('Tab');
    await expect(page.locator('[role=group]')).toHaveAttribute('aria-label', 'TAGS');
    await page.keyboard.press('Tab');
    await expect(page.locator('[role=group]')).toHaveCount(0); // no page matches "dev"
    await page.keyboard.press('Tab');
    await expect(page.locator('[role=group]')).toHaveCount(2); // back to all
  });

  test('the selected row scrolls into view without moving the document', async ({ page }) => {
    await open(page, 'e');
    const before = await page.evaluate(() => document.documentElement.scrollTop);
    const total = await page.locator('[role=option]').count();
    for (let i = 0; i < total - 1; i++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('[role=option]').last()).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(before);
  });
});

test.describe('states', () => {
  test('the chrome count reads INDEXED, MATCHES then EXIT 1', async ({ page }) => {
    await open(page);
    const chrome = page.locator('[role=dialog] [aria-hidden=true]', { hasText: /INDEXED|MATCH|EXIT/ });
    test.skip(isMobile(page), DESKTOP_ONLY);
    await expect(chrome).toHaveText('30 INDEXED');
    await page.locator('[role=combobox]').pressSequentially('homelab');
    await expect(chrome).toContainText('MATCHES');
    await page.locator('[role=combobox]').pressSequentially('zzz');
    await expect(chrome).toHaveText('EXIT 1');
  });

  test('the empty state offers recent posts and the six pages', async ({ page }) => {
    await open(page);
    await expect(page.locator('[role=listbox]')).toContainText('RECENT');
    await expect(page.locator('[role=listbox]')).toContainText('JUMP TO');
    await expect(page.locator('[role=option]')).toHaveCount(9); // 3 posts + 6 pages
  });

  test('a miss is a grep error, and every tag it offers is reachable', async ({ page }) => {
    await open(page, 'kubernetes');
    await expect(page.locator('[role=listbox]')).toContainText('grep: kubernetes: no matches in 30 files');
    await expect(page.locator('[role=option]')).toHaveCount(3);
    await expect(page.locator('[role=option][aria-selected=true]')).toHaveCount(1);
  });

  test('selection is a wash plus a left accent bar, never an inverted fill', async ({ page }) => {
    await open(page, 'dev');
    const style = await page.locator('[role=option][aria-selected=true]').evaluate((el) => {
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, border: s.borderLeftWidth, colour: s.borderLeftColor };
    });
    expect(style.background).toBe('rgba(169, 139, 245, 0.14)'); // --color-wash-code
    expect(style.border).toBe('2px');
    expect(style.colour).toBe('rgb(169, 139, 245)'); // --color-accent
  });
});

test.describe('geometry', () => {
  test('660px wide, 96px from the top, with the footer in view', async ({ page }) => {
    test.skip(isMobile(page), DESKTOP_ONLY);
    await open(page, 'e');
    const box = (await page.locator('[role=dialog]').boundingBox())!;
    expect(box.width).toBe(660);
    expect(box.y).toBe(96);
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect(page.locator('[role=dialog]').getByText('ESC CLOSE')).toBeInViewport();
  });

  test('full screen on a phone, with rows at least 44px tall', async ({ page }) => {
    test.skip(!isMobile(page), MOBILE_ONLY);
    await open(page, 'dev');
    const viewport = page.viewportSize()!;
    const box = (await page.locator('[role=dialog]').boundingBox())!;
    expect(box.width).toBe(viewport.width);
    expect(box.height).toBe(viewport.height);
    for (const row of await page.locator('[role=option]').all()) {
      expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('the mobile trigger is a real, visible, labelled button', async ({ page }) => {
    test.skip(!isMobile(page), MOBILE_ONLY);
    await load(page);
    const trigger = page.locator('button[data-palette-open]:visible');
    await expect(trigger).toHaveCount(1);
    await expect(trigger).toHaveAccessibleName('Search');
    await expect(trigger).toHaveText('SEARCH');
  });
});

test.describe('accessibility', () => {
  test('the combobox points at exactly one live option', async ({ page }) => {
    await open(page, 'dev');
    const state = await page.evaluate(() => {
      const input = document.querySelector('[role=combobox]')!;
      const active = input.getAttribute('aria-activedescendant');
      return {
        expanded: input.getAttribute('aria-expanded'),
        controls: input.getAttribute('aria-controls'),
        activeExists: !!document.getElementById(active ?? ''),
        selected: document.querySelectorAll('[role=option][aria-selected=true]').length,
        dialog: !!document.querySelector('[role=dialog][aria-modal=true]'),
        listbox: !!document.querySelector('[role=listbox]'),
      };
    });
    expect(state).toEqual({
      expanded: 'true',
      controls: 'palette-results',
      activeExists: true,
      selected: 1,
      dialog: true,
      listbox: true,
    });
  });

  test('the result count is announced politely', async ({ page }) => {
    await open(page, 'homelab');
    const live = page.locator('[role=status][aria-live=polite]');
    await expect(live).toHaveText(/^\d+ results?$/);
  });

  test('the caret and the dimmer are hidden from the reader', async ({ page }) => {
    await open(page);
    await expect(page.locator('[role=dialog] .caret')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.bg-scrim')).toHaveAttribute('aria-hidden', 'true');
  });

  test('axe reports no WCAG A/AA violations over the open palette', async ({ page }) => {
    await open(page, 'dev');
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('every glyph in the open palette comes from Departure Mono', async ({ page }) => {
    await open(page, 'dev');
    const fallbacks = await page.evaluate(() => {
      const probe = (ch: string) => {
        const s = document.createElement('span');
        s.style.cssText = 'font:100px "Departure Mono";position:absolute;visibility:hidden';
        s.textContent = ch;
        document.body.append(s);
        const w = s.getBoundingClientRect().width;
        s.remove();
        return w;
      };
      const M = probe('M');
      const dialog = document.querySelector<HTMLElement>('[role=dialog]')!;
      const used = [...new Set(dialog.innerText)].filter((c) => c.trim());
      return used.filter((c) => Math.abs(probe(c) - M) > 0.5);
    });
    expect(fallbacks, `these fell back to a system font: ${fallbacks.join(' ')}`).toEqual([]);
  });
});

test.describe('reduced motion', () => {
  // `test.use({ reducedMotion: 'reduce' })` does not reach Chromium's media
  // emulation in this Playwright version. See the note in motion.spec.ts.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('the caret is visible and static, not stuck mid-blink', async ({ page }) => {
    await open(page);
    const caret = page.locator('[role=dialog] .caret');
    await expect(caret).toBeVisible();
    const style = await caret.evaluate((el) => {
      const s = getComputedStyle(el);
      return { opacity: s.opacity, duration: s.animationDuration };
    });
    expect(style.opacity).toBe('1');
    expect(parseFloat(style.duration)).toBeLessThan(0.01);
  });
});

test.describe('the /play command', () => {
  // The game itself is gated at 900px on a fine pointer, so the row is too.
  // The mobile project is 390px wide, which is the unsupported side of it.
  const isSupported = (page: Page) => (page.viewportSize()?.width ?? 0) >= 900;
  const commands = (page: Page) => page.locator('[role=group][aria-label=COMMANDS]');

  test('offers the row for /play and for a bare play', async ({ page }) => {
    test.skip(!isSupported(page), 'the game needs 900px and a fine pointer');
    await open(page, '/play');
    await expect(commands(page)).toContainText('/play');
    await expect(commands(page)).toContainText('space invaders, in a terminal window');

    // `/` opens the palette and the open clears the query, so a reader who
    // arrives that way types the word without its slash.
    await page.locator('[role=combobox]').fill('play');
    await expect(commands(page)).toContainText('/play');
  });

  test('counts as a match rather than a miss', async ({ page }) => {
    test.skip(!isSupported(page), 'the game needs 900px and a fine pointer');
    await open(page, '/play');
    const chrome = page.locator('[role=dialog] [aria-hidden=true]', { hasText: /INDEXED|MATCH|EXIT/ });
    await expect(chrome).toHaveText('1 MATCH');
    await expect(page.locator('[role=listbox]')).not.toContainText('no matches');
  });

  test('is the first row, and Enter on it opens the game', async ({ page }) => {
    test.skip(!isSupported(page), 'the game needs 900px and a fine pointer');
    await open(page, '/play');
    await expect(page.locator('[role=option][aria-selected=true]')).toContainText('/play');

    await page.keyboard.press('Enter');
    await expect(page.locator('[role=dialog][aria-modal=true]')).toHaveCount(1);
    const root = page.locator('[data-invaders-root]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-armed', '');
    // The palette is gone, and the game owns the scroll lock it left behind.
    await expect(page.locator('[role=listbox]')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  });

  // A guard, not a discovery: the row adds copy the audit above never sees,
  // because that one opens the palette on a search query.
  test('every glyph in the row comes from Departure Mono', async ({ page }) => {
    test.skip(!isSupported(page), 'the game needs 900px and a fine pointer');
    await open(page, '/play');
    const fallbacks = await page.evaluate(() => {
      const probe = (ch: string) => {
        const s = document.createElement('span');
        s.style.cssText = 'font:100px "Departure Mono";position:absolute;visibility:hidden';
        s.textContent = ch;
        document.body.append(s);
        const w = s.getBoundingClientRect().width;
        s.remove();
        return w;
      };
      const M = probe('M');
      const dialog = document.querySelector<HTMLElement>('[role=dialog]')!;
      const used = [...new Set(dialog.innerText)].filter((c) => c.trim());
      return used.filter((c) => Math.abs(probe(c) - M) > 0.5);
    });
    expect(fallbacks, `these fell back to a system font: ${fallbacks.join(' ')}`).toEqual([]);
  });

  test('does not exist below the gate', async ({ page }) => {
    test.skip(isSupported(page), 'the row is real above 900px');
    await open(page, '/play');
    await expect(commands(page)).toHaveCount(0);
    await expect(page.locator('[role=listbox]')).toContainText('no matches');
  });
});
