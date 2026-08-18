# 04 — Verification

You have a browser. Use it every phase, not once at the end. The rule: **you do not get to claim a
page is done until you have looked at it at 1440 and at 390.**

## The loop

```bash
npm run build && npx serve dist -p 4321   # test the built output, not the dev server
```

Then, per route, at each width in the sweep: navigate, wait for the font, screenshot, read the
console, compare against the mockup, fix, repeat.

Widths: **390** (phone, primary), **768** (tablet), **1024** (small laptop), **1440** (desktop,
primary). Plus one pass at **320** and one at **2560** purely to confirm nothing overflows or
stretches past `max-w-window`.

The two primary widths are the ones with designs behind them. 768 and 1024 have no bespoke layout
and are not supposed to — they are the desktop composition narrowing. Check them for breakage
(overlap, overflow, a two-column grid squeezing text to 20ch), not for fidelity to a mock.

## Reference comparison

`handoff/reference/mockups.html` is the ground truth. Open it in a second tab, screenshot the
matching screen, and put the two images side by side. In turn 1, **only option `1c` is the chosen
direction** — `1a` and `1b` are rejected.

Watch specifically for: hairline weights (four distinct values, easy to flatten to one), the gap
rhythm between sections, whether labels are 11px uppercase with the right tracking, and whether the
active tab is a fill rather than a colour change.

## Automated checks

Run these against the built site. They encode the failures that actually happened while the design
was being made.

**1. Font loaded, and glyphs are genuine.** Every character in the UI must come from Departure Mono.
Fallback glyphs are visually obvious but easy to miss in review.

```js
// in page context
const probe = (ch) => {
  const s = document.createElement('span');
  s.style.cssText = 'font:100px "Departure Mono";position:absolute;visibility:hidden';
  s.textContent = ch; document.body.append(s);
  const w = s.getBoundingClientRect().width; s.remove(); return w;
};
const M = probe('M');                       // 63.64 when the font is loaded
const used = [...new Set(document.body.innerText)].filter(c => c.trim());
const fallbacks = used.filter(c => Math.abs(probe(c) - M) > 0.5);
```

`fallbacks` must be empty. Known offenders: `● ▶ ▚ ✓ ★ ⧉ ≡ ✕ ⚠`. Known-good: `░ ▒ ▓ █ ▲ ▼ ← → ↑ ↓ ↗ ⌘ § ·`
and the box-drawing set.

**2. Code blocks render as separate lines.** The failure is silent — lines fuse into one run and the
block scrolls sideways.

```js
[...document.querySelectorAll('pre')].map(p => ({
  lines: p.children.length,
  overflows: p.scrollWidth > p.clientWidth,
  distinctBaselines: new Set([...p.children].map(c => c.getBoundingClientRect().top)).size,
}));
```

`distinctBaselines` must equal `lines`.

A `<pre>` MAY scroll horizontally inside its own box — `CodeBlock.astro` sets `overflow-x-auto` on
purpose, and the corpus has a 334-character line (a prose comment in an old post, not code anyone
must read unbroken). Wrapping it would break shell commands mid-flag, so `overflows` above is not
an assertion; it's informational. The check that protects the reading experience is check 3: the
page itself must never scroll sideways, at any width. A deliberate ASCII banner is the one other
element allowed to run wide, and only inside its own box, same as a `<pre>`.

**3. No horizontal overflow, any width.**

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

**4. Contrast.** Every text/surface pair ≥ 4.5:1. Against `--color-surface-window` the design's inks
compute to 14.8 / 11.3 / 7.4 / 5.4. `--color-ink-faint` is permitted only inside code blocks, and it
carries the least headroom of any pair in the system: 4.8:1 against `--color-surface-code`. Measure it
on that surface, not on the window, and treat any change to either value as a contrast change.

`tests/e2e/axe.spec.ts` runs this check, and the rest of WCAG 2.1 A/AA, over every template at 1440
and 390. It uses the axe engine, which is what Lighthouse scores accessibility with, so a green run
here is the same answer Lighthouse gives. Note what it cannot judge: axe returns "incomplete", not a
pass, for text over a gradient, which covers the `COVER 2:3` labels on the dither placeholders on
`/reading/`. Those need an eye. Roughly 1.4% of text nodes land in that bucket; the rest are decided.

**5. Tap targets at 390.** Every link inside a listing row ≥ 44px tall.

**6. Reduced motion.** With `prefers-reduced-motion: reduce`, the scanline overlay must be static and
the caret must be visible, not stuck mid-blink.

```js
await page.emulateMedia({ reducedMotion: 'reduce' });
```

**7. Accessible heading order.** On a post, `h1` is the post title — not the `$ cat …` prompt line.
Check the accessibility tree, not the DOM order.

**8. Zero console errors.** Any 404 for a font, image or asset is a failure.

~~**9. JavaScript budget.** A post page ships < 5 kB of JS. `CommandPalette` is the only island
allowed to exceed that, and only on pages where it is used.~~

Check 9 is struck. Bruno chose a React island over the JS budget; the budget no longer applies.

**10. The ⌘K palette.** Keyboard first, so screenshots alone will not catch what matters. Drive it
with the mouse untouched: `⌘K` and `Ctrl+K` both open and are both prevented from reaching the
browser; `/` opens outside a field and types itself inside one; `↑` `↓` walk one flat list across
the group rules and wrap at both ends; `Enter` opens the selected URL; `Tab` cycles the group filter
and never moves focus out of the dialog; `Backspace` on an empty query closes; `Esc` closes and
`document.activeElement` is the trigger again. The document must not scroll while the selected row
comes into view. Then check the states: `N MATCHES`, `30 INDEXED` empty, `EXIT 1` on a miss;
selection is a wash plus a 2px left bar, never an inverted fill; 660px wide and 96px from the top
above 640px, full screen below it with every row ≥44px; the footer is not clipped at 900px height.
`tests/e2e/palette.spec.ts` encodes all of this, including axe and the glyph audit over the open
palette. `tests/unit/search.test.ts` covers ranking and caps, and `tests/unit/search-index.test.ts`
guards the index shape and its size.

## Per-route checklist

| Route | Beyond the standard checks |
|---|---|
| `/` | latest 3–5 posts only; links out present |
| `/posts/` | year grouping correct; tag counts match the collection |
| `/posts/[slug]` | outline rail sticky ≥900px, disclosure below; prev/next correct at both ends; copy button copies |
| `/tags/[tag]` | a page exists for every tag in use; counts match |
| `/reading/` | reading grid 4-up desktop / 2-up mobile; finished 6-up / 3-up; missing covers fall back to dither |
| `/courses/` | user's copy verbatim, in full, at both widths |
| `/system/` | specimens render from real components; ratios computed, not typed |
| `/404` | returns 404 on Cloudflare, not 200 |

## Before you hand back

Lighthouse on `/posts/[slug]`: performance ≥ 95, accessibility 100, best practices 100.
Then re-run the full URL diff from `03-content-migration.md` — no post may have moved.
