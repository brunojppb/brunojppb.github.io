# CONSOLE — design system for bpaulino.com

A dark, monospaced, terminal-shaped design language for a personal engineering blog.
Static site, **Astro** with **React islands** only where interaction demands it.

Everything visual derives from `tokens.css`. Read that file first; it is the source of truth
and this document explains how to use it.

---

## 0. How to use this with Claude Code

1. Read `tokens.css` and copy it to `src/styles/tokens.css`.
2. Read §7 (Components) and build each one in the order listed — primitives before compositions.
3. Read §8 (Page recipes) and assemble the routes.
4. Obey §4 (Typography rules) and §11 (Glyph allowlist) literally. Both have bitten this design already.

Do not introduce a UI library, a CSS framework, an icon set, or a third font.
The system is deliberately small enough to hold in your head.

---

## 1. Principles

**The page is a terminal, not a page dressed as one.** Every screen is a command and its output.
The archive is `ls`, prose is `cat`, tag pages are `grep`, the 404 is a real `cat:` error. If a new
page has no plausible command, it probably doesn't belong.

**Two faces, one weight, one accent.** Departure Mono is the console voice. JetBrains Mono is the
reading surface, and it appears only where someone reads a long stretch of text: post body and code.
Each face ships in a single weight. Emphasis is colour, inversion, or a leading block glyph. Never
synthesise bold.

**Texture is ambient, never content.** Scanlines and the dither in placeholders sit behind or
beside information. They never carry meaning and they always survive being switched off.

**Density with air.** Rows are tight, sections are far apart. The rhythm comes from generous
gaps between blocks, not from padding inside them.

**Readable first.** It is a blog. Body copy is 16.5px at 1.6 on mobile and desktop alike; the
frame shrinks, the text does not.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Astro (static output) | `output: 'static'`, no SSR |
| Components | `.astro` by default | zero JS shipped |
| Interactivity | React islands (`.tsx`) | only the three in §7.4 |
| Styling | Plain CSS custom properties + component-scoped `<style>` in each `.astro` file | no Tailwind, no CSS-in-JS |
| Content | Markdown/MDX in `src/content/` via content collections | `posts`, `books`, `projects` |
| Hosting | Cloudflare Pages | unchanged |

Suggested tree:

```
src/
  styles/tokens.css          # this system
  layouts/BaseLayout.astro
  components/
    chrome/   Window.astro  TabBar.astro  Scanlines.astro
    shell/    PromptLine.astro  Caret.astro  SectionRule.astro
    content/  Prose.astro  CodeBlock.astro  Callout.astro  Outline.astro
    listing/  FileRow.astro  Tag.astro  Pagination.astro
    media/    BookCover.astro  AsciiBanner.astro
    islands/  CopyButton.tsx  OutlineDisclosure.tsx
  content/  posts/  books/  projects/
  pages/    index.astro  posts/[...].astro  tags/[tag].astro
            about.astro  src.astro  reading.astro  404.astro
```

---

## 3. Colour

Nine surfaces and inks, one accent. Names and values live in `tokens.css`.

- **Surfaces** step from `--surface-page` (the void the window floats in) up through
  `--surface-window`, `--surface-tabbar`, `--surface-chrome`. Code blocks go *darker* than the
  window, not lighter.
- **Ink** has five steps. `--text-primary` for headings, links and filenames; `--text-body` for
  prose; `--text-secondary` for prompts; `--text-muted` for every 11px label, date and count;
  `--text-faint` only for code comments.
- **Accent** is violet. `--surface-accent` is the fill behind the active tab and active tag —
  always with `--text-on-accent` on top. `--text-accent` (the lighter lift) is the accent used as
  *text*, because the fill value is too dark against the panel at small sizes.
- **Lines** are the workhorse. Four weights of hairline separate everything; borders do the job
  that shadows and radii do elsewhere.

**Links in body copy are underlined.** A 1px rule at `--border-accent-soft`, 2px below the text,
going solid accent on hover. This holds in a post and in page copy alike, so the rule lives in
theme.css's base layer rather than in `Prose.astro`. Colour cannot carry a link on its own here:
the accent is 1.17:1 against the prose it interrupts, and no colour fixes that, since reaching the
3:1 WCAG asks for would need a lightness above white or one dark enough to fail 4.5:1 against the
page. Chrome, nav, the tab strip and listing rows are not body copy and carry no underline.

**Two values exist for the ⌘K palette alone**, and only in `theme.css`: `--color-scrim`
(`rgb(9 9 13 / .78)`), the dimmed page it sits on, and `--color-line-palette`, the window line at
50%. Nothing else uses them.

**Radii are zero everywhere. Shadows do not exist.** The only depth cue is the 1px window border.

Minimum contrast: no text below 4.5:1 against its own surface. Measured against
`--surface-window` (#101017): `--text-primary` 14.8:1, `--text-body` 11.3:1, `--text-secondary`
7.4:1, `--text-muted` 5.4:1. `--text-muted` at 11px is the floor; do not invent anything fainter
for text. `--text-faint` is
permitted only inside code blocks where it labels comments, never for UI copy. It is measured
against `--surface-code` instead, where it reaches 4.8:1.

---

## 4. Typography rules

- Two families, and the split is by reading distance, not by component. `--font-mono` (Departure
  Mono) is the console voice: chrome, tab bar, prompts, headings, listing rows, 11px labels, ASCII
  art. `--font-prose` (JetBrains Mono) is the reading surface: post body, inline code, code blocks.
  Departure carries the identity; JetBrains Mono carries the paragraphs. Nothing else is added.
- **Sizes are multiples of 11 or 5.5.** Departure Mono is a pixel face and renders crisply on that
  grid. Do not use 14px, 18px or 24px. JetBrains Mono is not bound to the grid, but it shares the
  same tokens so the two faces stay on one scale. Measured at 100px, the two x-heights are 55 and
  54.5, so a given size reads at the same apparent size in either face. That is why adding the
  second face needed no change to the scale.
- **No ligatures, ever.** JetBrains Mono ships code ligatures and draws `=>` as one arrow, `!=` as
  `≠`, `<=` as `≤` and `|>` as `▷`. Two of those are on the banned list in §11, and none of them are
  what the file says. `font-variant-ligatures: none` in the base layer turns them off everywhere, on
  the same `*` rule that refuses synthetic bold. It is one property, not a per-block choice, and
  Departure Mono has no ligatures so it only ever binds on the reading face. Copy and paste was never
  affected: the copy control carries the source text.
- **No bold, ever.** No `font-weight`, no `<strong>` styled heavier. For emphasis use, in order of
  preference: `--text-accent`, inversion (accent fill + `--text-on-accent`), a leading `█` or
  `▓▒░`, or uppercase with `--tracking-label`.
- Uppercase is reserved for 11px labels, tags, and chrome. Never uppercase a heading or a sentence.
- Headings are `--leading-tight` with `--tracking-tight`; body is `--leading-body`; code is
  `--leading-code`.
- Prose is capped at `--measure` (68ch). Listing rows and tables are not. `ch` resolves against
  JetBrains Mono inside a post, so the same 68ch is about 6% narrower in pixels than it was on
  Departure alone.
- Filenames, paths, commands and hostnames appear in running text as plain type — the whole page is
  already monospace, so `<code>` is reserved for values you would copy (see §7.9).
- **How the switch is wired, because it is not where you would look for it.** Tailwind's preflight
  styles `code`, `kbd`, `samp` and `pre` from `--default-mono-font-family`, and that beats inheriting
  from a wrapper class. `theme.css` points that variable at `--font-prose`, which is what puts every
  code block and every inline chip on JetBrains Mono with no class on the element. Two consequences:
  a `pre` that is texture rather than text must ask for `font-mono` back (§7.15), and the `.prose`
  wrapper has to put `h2/h3/h4` back to `--font-mono` explicitly (§7.16).
- Departure Mono sits second in the `--font-prose` stack, ahead of the system fallbacks. JetBrains
  Mono's subset has no arrows and no block glyphs, so anything off it lands on the design's own
  face. Verified for `→` in post copy.

---

## 5. Motion

Two ambient animations, both decoration, both defined in `tokens.css`:

- `console-blink` — the block caret, `--dur-blink`, `steps(1)`. One caret per screen, at the last
  prompt.
- `console-scan` — the scanline overlay, `--dur-scan`, linear, infinite. A 1px violet line every
  `--scan-pitch`, drifting `--scan-shift`.

A third, `console-sweep`, is used once: the dither bar on the 404.

Everything else is instant. No page transitions, no fades, no scroll animation, no hover
transitions longer than 0ms — hovers change colour immediately.

`prefers-reduced-motion: reduce` kills all three and pins the caret visible. That rule ships in
`tokens.css`; do not add animations that escape it.

---

## 6. Layout

- The window is `--page-max` (1100px) wide, centred, with `--pad-page` of void around it.
- Inside, `--pad-window` on all sides of the body; the chrome bar and tab strip are full-bleed to
  the window border.
- Post pages split `1fr / --rail-width` — prose left, outline rail right, separated by a hairline.
  Below 900px the rail becomes a disclosure strip under the title (§7.13).
- Section spacing: `--space-8` between major blocks, `--space-4` between rows within a block.
- Mobile (≤640px): `--pad-page` drops to 10px, `--pad-window` to 16px, the chrome bar loses the
  window dimensions and gains a menu button, the tab strip scrolls horizontally, and code blocks
  break out to the full window width with a negative inline margin.

---

## 7. Components

Build in this order. Everything is `.astro` unless marked **island**.

### 7.1 `Scanlines.astro`
Viewport-fixed overlay, `pointer-events: none`, `aria-hidden`. It covers the whole screen at every
width — it is the glass the console sits behind, not a texture on the window column — and it does
not scroll with the page.
`repeating-linear-gradient(180deg, var(--wash-scanline) 0 1px, transparent 1px var(--scan-pitch))`
animated with `console-scan`. Rendered once per page by `BaseLayout`, above the page background and
below the window. No props.

### 7.2 `Window.astro`
The frame every page lives in.
Props: `title` (string, the shell path — `bruno@bpaulino: ~/posts`), `meta` (string or slot, right
side of the chrome bar), `dims` (string, optional, e.g. `132×48`, hidden on mobile).
Anatomy: 1px `--border-window` around `--surface-window`; chrome bar at `--surface-chrome` with
`--pad-chrome`, bottom border `--border-chrome`; three 9px squares (two `--surface-inert`, the last
`--surface-accent`) — squares, never circles; title in 11px `--text-muted` with `--tracking-chrome`;
`meta` pushed right.
Slots: `default` (body), `chrome-meta`, `tabs`.

### 7.3 `TabBar.astro`
Props: `items` (`{label, href}[]`), `current` (string).
A flex row inside the window, below the chrome bar, on `--surface-tabbar`, bottom border
`--border-hairline`. Labels are the paths themselves: `posts/`, `about.md`, `src/`, `reading/`,
`courses/`, `system/`. Active tab is `--surface-accent` + `--text-on-accent`; inactive is `--text-secondary`
with a right hairline.
Mobile: `overflow-x: auto`, `scrollbar-width: none`, `flex: none` on every tab, real labels — never
truncate a destination away.
The strip ends in the `⌘K` cell (`SearchTrigger.astro`, `variant="tab"`), right-aligned and hidden
below `md`. It inverts to `--surface-accent` while the palette is open. The six destinations come
from `TABS` in `src/lib/nav.ts`, which `NavSheet` and the palette read as well.

### 7.4 Islands (React, `client:idle` unless noted)
- `CopyButton.tsx` — the `[ COPY ]` control in a code block header. `client:visible`.
- `CommandPalette.tsx`: the ⌘K search palette, mounted once in `BaseLayout`. See §7.17.
- `OutlineDisclosure.tsx` — mobile outline toggle. Prefer native `<details>`; use the island only
  if you need the scroll-spy active state.

Nothing else ships JavaScript.

### 7.5 `PromptLine.astro`
The heading device of the whole site.
Props: `path` (default `~`), `command` (string), `caret` (boolean, default false).
Renders `bruno@bpaulino` in `--surface-accent` colour, `:` in `--text-secondary`, `path` in
`--c-violet-deep`, `$ ` then the command in `--text-secondary`. Size `--text-md` desktop,
`--text-xs` mobile. One per section; the last one on a page may carry the caret.

### 7.6 `Caret.astro`
An inline-block filled rectangle, `--surface-accent`, sized to the adjacent text (9×17px at
`--text-md`, 7×14px at `--text-xs`), `animation: console-blink var(--dur-blink) var(--ease-step) infinite`.
Class `caret` so the reduced-motion rule can pin it. Never more than one visible at a time.

### 7.7 `SectionRule.astro`
Props: `label`, `meta` (optional, right), `tone` (`accent` | `muted`, default `muted`).
11px uppercase label with `--tracking-section`, a 1px `--border-default` line filling the gap, and
optional right-aligned 11px meta (`04`, `24 FILES`). Year headings on the archive use
`tone="accent"` and the label is the directory: `2026/`.

### 7.8 `FileRow.astro`
The listing primitive — used by the archive, tag pages and the home feed.
Props: `date` (ISO), `size` (string), `title`, `description`, `tags` (string[]), `href`.
Desktop: `grid-template-columns: 120px 60px 1fr auto`, `--space-4` gap, `--space-3` vertical
padding, bottom border `--border-faint`. Title in `--text-primary` at `--text-md`, the post's
`description` beneath in `--text-xs --text-muted`, tags right in 11px `--text-accent`.
Mobile: one column — a date/size row in 11px, then title, then description, then tags. Tap target is
the whole row, minimum 44px tall.
Hover: title → `--text-accent`. No background change, no transform.

### 7.9 `CodeBlock.astro`
Props: `filename`, `lang`, `code`, `showLineNumbers` (default true).
Header strip: filename left, `[ COPY ]` right, both 11px `--text-muted`, bottom border
`--border-hairline`. Body on `--surface-code`, `--text-sm`, `--leading-code`, line numbers in
`--text-muted`, comments in `--text-faint`, string/value runs in `--text-accent`.

The two halves are in different faces on purpose: the body is `--font-prose`, because it is code
someone reads, and the header strip carries `font-mono`, because the label and the copy control are
chrome. The strip needs that class explicitly. Inside a post it would otherwise inherit JetBrains
Mono from the `.prose` wrapper and stop matching the same component on `/system`.

> **Each line must be its own block element.** Newlines between inline elements are not reliable
> across template compilers, and a collapsed code block is the single worst failure this design can
> have. Emit `<div>` (or `<span style="display:block">`) per line inside the `<pre>`.

Inline code inside prose: `--wash-accent-code` background, `--text-accent`, `1px 6px` padding, no
radius.
Mobile: full-bleed — negative inline margin equal to `--pad-window`, top and bottom borders only.

### 7.10 `Callout.astro`
Props: `label` (default `! NOTE`), `tone` (`note` | `warn`).
1px **dashed** `--border-accent-soft`, `--space-4` padding, label 11px `--text-accent` on the left,
body `--text-sm --text-body`. Dashed is what distinguishes it from every other bordered box; keep it.

### 7.11 `Tag.astro`
Props: `label`, `count` (optional), `href`, `active` (boolean).
11px, `--tracking-chrome`, `5px 11px` padding. Inactive: 1px `--border-strong`, `--text-secondary`.
Active: `--surface-accent` fill, `--text-on-accent`. Counts render as a trailing number inside the
chip — `platform 7`.

### 7.12 `BookCover.astro`
Props: `src` (optional), `alt`, `status` (`reading` | `finished`).
2:3 box. With `src`, the image fills it with a 1px border. Without, a dither placeholder:
`repeating-linear-gradient(135deg, var(--wash-dither) 0 3px, transparent 3px 8px)` and an 11px
`COVER 2:3` label bottom-left.
`reading` → `--border-accent-soft`, full opacity, `█ READING` label above the title.
`finished` → `--border-strong`, `opacity: .8`, `[x] MAR 2021` label beneath.
Grid: 4-up desktop / 2-up mobile for reading; 6-up desktop / 3-up mobile for finished.

### 7.13 `Outline.astro`
Props: `headings` (`{depth, text, slug}[]`), `variant` (`rail` | `disclosure`).
Desktop: sticky rail, 11px `OUTLINE` label, entries rendered with their markdown prefix — `## The
problem` — active entry in `--text-accent`.
Mobile: a bordered disclosure under the post title, collapsed by default.
The active entry is the section the reader is in, not a build-time prop: a hoisted script marks it
with `aria-current="location"` as the page scrolls. A heading becomes current once it passes a line
a quarter down the viewport, so the highlight follows the text on screen. Nothing is marked above
the first heading; the end of the page belongs to the last one. Colour only, no marker glyph and no
transition.

### 7.14 `Pagination.astro`
Props: `shown`, `total`, `nextHref`.
A single line: `showing 8 of 24` in `--text-muted`, `load older ↓` in `--text-accent`, right-aligned.
`↓ ← → ↗` are the only arrows in the system and all four are in the font.

### 7.15 `AsciiBanner.astro`
Props: `rows` (string[]), `animate` (`drift` | `sweep` | none).
A `<pre>` of block characters at `--text-xs`, `--leading-flat`, accent colour at 30–50% opacity,
`aria-hidden`. Author rows wide enough to bleed past the container — at 13px each glyph advances
8.27px, so a 1100px container needs ≥134 columns. For a vertical loop, repeat the field twice and
translate by -50%.
Currently used only on the 404. **Do not draw letterforms out of ASCII** — Departure Mono is already
a pixel face; set big type instead.
This is the one `<pre>` on the site that carries `font-mono`. Every other `pre` is the reading face
(§4), and this one is texture drawn on Departure Mono's grid, so it opts back out. Remove that class
and the 404 art collapses into JetBrains Mono.

### 7.16 `Prose.astro`
Wraps rendered markdown. Caps at `--measure`. Styles `h2` as `--text-lg --text-accent` prefixed with
`##`, `p` as `--text-body` with `--space-5` between, `ul/ol` with `–` and `01.` markers,
`blockquote` with a left 2px accent rule. Links are `--text-accent` with a 1px underline that becomes
solid accent on hover, but that rule is not in this component: see §3.

Sets `--font-prose` on the wrapper, then puts `h2/h3/h4` back to `--font-mono`. That pairing is the
whole reading experience: console-voice headings with their `##` prefixes over JetBrains Mono
paragraphs.
The post `h1` lives outside this component, in the route, so it stays Departure without a rule here.

### 7.17 `CommandPalette.tsx` (island)
The ⌘K overlay: search over posts, tags and pages, keyboard first. Mounted once in `BaseLayout`
with `client:idle`, and the only island on most pages. Mockups 4a/4b/4c in
`handoff/reference/mockups.html`.

A `Window` centred over the scrim (`--color-scrim`), 660px wide, 96px from the top, capped at
`calc(100vh - 192px)`, results scrolling inside. Its border is `--color-line-palette`, the window
line lifted to 50%, because it floats over a dimmed page. Below 640px it is full screen.
The chrome bar carries `⌘K`, the shell path, and a right-hand count: `N MATCHES`, `30 INDEXED` when
the query is empty, `EXIT 1` on a miss. The input row is a prompt on `--surface-code` at
`--text-lg`: `$` in the accent, `grep` in `--text-secondary`, the query in `--text-primary`, then a
block caret one character wide at `left: <query.length>ch`. The input is real, with
`caret-color: transparent`, because mobile keyboards and IME need it.
Results group POSTS / TAGS / PAGES, each with a rule and a true total, capped at 5 / 3 / 3 rows.
A row shows where it matched: nothing for a title (the match is visible), `matched #devops` for a
tag, `matched dev in summary` for a description. Post bodies are not indexed.
Selection is `--wash-accent-code` plus a 2px left `--surface-accent` bar, never the inverted fill
the active tab uses: selection moves on every keypress and a fill would strobe. A selected row
lifts its date and provenance from `--text-muted` to `--text-secondary`, because `--text-muted`
measures 4.45:1 against that wash.
Empty offers RECENT posts and a JUMP TO chip row of the six pages. A miss is a real error line,
`grep: kubernetes: no matches in 30 files`, then one muted line, then the three highest-count tags
as chips. Every chip is an option, so the arrow keys reach it.
Keyboard: `⌘K`/`Ctrl+K` toggles, `/` opens when focus is outside a field, `↑` `↓` walk one flat
list across the group rules and wrap, `Enter` opens, `Tab` cycles all → posts → tags → pages,
`Backspace` on an empty query closes, `Esc` closes and returns focus to the trigger. Focus stays in
the dialog because `Tab` never moves it.
The index is a static `/search-index.json`, emitted by `src/pages/search-index.json.ts` at build
time, 9.6 kB for 30 posts, 14 tags and 6 pages. It is fetched on first open, prefetched on hover or
focus of a trigger, and cached in module scope. There is no search library: substring matching over
this shape is enough, and a dependency here would be the largest thing on the site.

---

## 8. Page recipes

Every page: `BaseLayout` → `Scanlines` + `Window` → `TabBar` → content.

| Route | Command | Body |
|---|---|---|
| `/` | `whoami` then `ls -lt posts/` | intro block, 3–5 `FileRow`, links out |
| `/posts/` | `ls posts/ --sort=date` | `Tag` filter row, `SectionRule` per year, `FileRow` list, `Pagination` |
| `/posts/[slug]/` | `cat <file>.md` | title, meta, `Prose` + `CodeBlock`/`Callout`, `Outline` rail, prev/next, closing prompt |
| `/about/` | `cat about.md` then `history --work` then `echo $STACK` | bio + 1:1 dithered photo, role list with date column, stack chips |
| `/src/` | `git remote -v` | two pinned repo cards, then a compact repo list |
| `/reading/` | `ls reading/ --status=open` | `SectionRule` + `BookCover` grids, reading then finished in one flat list |
| `/tags/[tag]/` | `grep -rl "#<tag>" posts/` | match count, `FileRow` list, all-tags chip cloud |
| `/courses/` | `ls -l courses/` | intro, 3-cell stat strip, course entries with 16:9 thumbnail, enrol buttons |
| `/system/` | `cat system/README.md` | this design system, published — colour, type, component gallery, glyph allowlist |
| `/404` | `cat posts/this-one.md` → error | 110px `404`, dither bar, error line, `cd` links |

---

## 9. Content and tone

First person, past tense for what happened, present for what is true. Plain, specific, unhurried.
Lowercase for anything that imitates shell output; sentence case for prose; uppercase only for
11px labels.

Post subtitles state what the reader will be able to do, not why it matters. Section labels are
nouns. Counts are always shown (`24 FILES`, `2 MATCHES`, `04`) — the system likes to tell you how
many of a thing there are. No exclamation marks, no emoji, no "dive in", no marketing voice.

Dates are `YYYY-MM-DD` in listings and chrome, `2026 APR 19` in prose meta. Sizes are fake-but-
plausible file sizes; keep them if you like the joke, drop them everywhere if you don't — but don't
keep them on some listings and not others.

---

## 10. Accessibility

- Every colour pair meets 4.5:1. Re-check if you add a surface.
- The window chrome dots are decorative: `aria-hidden`.
- Scanlines, dither placeholders and ASCII banners: `aria-hidden`.
- The shell prompt is decoration around a real heading — the `<h1>` must be the title, not the
  prompt line. Do not let `$ cat about.md` be the accessible page heading.
- Tap targets ≥44px on mobile; the listing row padding is set for this.
- Focus: 2px `--surface-accent` outline, 2px offset, never `outline: none`.

---

## 11. Glyph allowlist

Departure Mono has 775 glyphs; several obvious pictographs are **not** among them and fall back to
a system sans, which is instantly visible next to pixel type.

This list is Departure Mono's, and it governs the whole site. In post copy the order runs the other
way: JetBrains Mono is tried first, and its subset lacks the arrows and the block glyphs, so those
land on Departure, which is second in the `--font-prose` stack. That means the safe set below stays
safe inside a post, in Departure, next to JetBrains Mono paragraphs. The banned set is still banned
everywhere.

**Safe:** `░ ▒ ▓ █` · `▲ ▼` · `← → ↑ ↓ ↗` · `⌘` · `§` · `·` · box drawing (`─ │ ┌ ┐ └ ┘ ├ ┤`) · all
Latin, Greek, small caps, old-style numerals, fractions.

**Not in the font — never use:** `● ▶ ▚ ✓ ★ ⧉ ≡ ✕ ⚠`

Substitutions this design uses: status dot → `█`; done → `[x]`; play/newest → `>>`; section marker →
`▓▒░`; copy → `[ COPY ]`; hamburger → three CSS bars, not a glyph.

When in doubt, measure: render the candidate and an `M` at 100px and compare `getBoundingClientRect().width`.
A mismatch against the font's 64px advance means it fell back. Departure Mono advances 63.64 at
100px and JetBrains Mono 60, so the measurement also tells you which of the two faces you got.

---

## 12. Licensing

Departure Mono © Helena Zhang, SIL Open Font License 1.1. Free for commercial use; ships with the
site. Download the woff2 from departuremono.com, put it in `public/fonts/`, and keep the OFL text
alongside it. The mockups load a third-party jsDelivr mirror purely for preview — do not ship that.

JetBrains Mono © The JetBrains Mono Project Authors, SIL Open Font License 1.1. Also free for
commercial use and also shipped with the site, as `JetBrainsMono-Regular-latin.woff2` (21.2 KB) and
`JetBrainsMono-Regular-latin-ext.woff2` (7.3 KB), with the OFL text in `JetBrainsMono-LICENSE.txt`.

**Both faces are served from this origin. Never a font CDN.** Split the JetBrains Mono file by
`unicode-range`: latin carries every accent the pt-BR posts use, so latin-ext only downloads if a
post reaches past Latin-1, and only the latin file is preloaded. `tests/e2e/font.spec.ts` fails on
any font request that leaves the origin, and it checks both faces load rather than falling back.

---

## 13. The /system page

The design system is itself a page on the site, at `/system`, behind the `system/` tab. It is not a
private document: it renders the live component gallery from the same components the rest of the
site uses, so it cannot drift. Build it last, from the real components — never re-implement a
swatch or a specimen by hand.

Sections, in order: colour (surfaces, ink, accent, lines with their measured ratios), type (the
scale table plus the emphasis/never pair), components (one row each: name, one-line contract, live
render showing every state), glyphs (safe vs fallback), still-open. Reference:
`CONSOLE Design System.dc.html`.

---

## 14. Open questions

- Search beyond posts, tags and pages. The palette does not index the reading list or the courses,
  and it does not read post bodies.
- No search or pagination beyond "load older" has been designed.
