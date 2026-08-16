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

Do not introduce a UI library, a CSS framework, an icon set, or a second font.
The system is deliberately small enough to hold in your head.

---

## 1. Principles

**The page is a terminal, not a page dressed as one.** Every screen is a command and its output.
The archive is `ls`, prose is `cat`, tag pages are `grep`, the 404 is a real `cat:` error. If a new
page has no plausible command, it probably doesn't belong.

**One weight, one font, one accent.** Departure Mono has a single weight. Emphasis is colour,
inversion, or a leading block glyph. Never synthesise bold.

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
    islands/  CopyButton.tsx  CommandPalette.tsx  OutlineDisclosure.tsx
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

**Radii are zero everywhere. Shadows do not exist.** The only depth cue is the 1px window border.

Minimum contrast: no text below 4.5:1 against its own surface. Measured against
`--surface-window` (#101017): `--text-primary` 14.8:1, `--text-body` 11.3:1, `--text-secondary`
7.4:1, `--text-muted` 5.4:1. `--text-muted` at 11px is the floor; do not invent anything fainter
for text. `--text-faint` is
permitted only inside code blocks where it labels comments, never for UI copy.

---

## 4. Typography rules

- One family: `--font-mono`. No pairing, no fallback face in the design.
- **Sizes are multiples of 11 or 5.5.** Departure Mono is a pixel face and renders crisply on that
  grid. Do not use 14px, 18px or 24px.
- **No bold, ever.** No `font-weight`, no `<strong>` styled heavier. For emphasis use, in order of
  preference: `--text-accent`, inversion (accent fill + `--text-on-accent`), a leading `█` or
  `▓▒░`, or uppercase with `--tracking-label`.
- Uppercase is reserved for 11px labels, tags, and chrome. Never uppercase a heading or a sentence.
- Headings are `--leading-tight` with `--tracking-tight`; body is `--leading-body`; code is
  `--leading-code`.
- Prose is capped at `--measure` (68ch). Listing rows and tables are not.
- Filenames, paths, commands and hostnames appear in running text as plain type — the whole page is
  already monospace, so `<code>` is reserved for values you would copy (see §7.9).

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
Absolutely positioned overlay, `inset: 0`, `pointer-events: none`, `aria-hidden`.
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
with a right hairline. `⌘K` hint pinned right on desktop only.
Mobile: `overflow-x: auto`, `scrollbar-width: none`, `flex: none` on every tab, real labels — never
truncate a destination away.

### 7.4 Islands (React, `client:idle` unless noted)
- `CopyButton.tsx` — the `[ COPY ]` control in a code block header. `client:visible`.
- `CommandPalette.tsx` — the ⌘K overlay: fuzzy search over posts, tags and pages. Renders as a
  window-within-a-window using the same `Window` visual language, centred, with the page dimmed
  behind. `client:idle`.
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
Props: `date` (ISO), `size` (string), `title`, `filename`, `tags` (string[]), `href`.
Desktop: `grid-template-columns: 120px 60px 1fr auto`, `--space-4` gap, `--space-3` vertical
padding, bottom border `--border-faint`. Title in `--text-primary` at `--text-md`, filename beneath
in `--text-xs --text-muted`, tags right in 11px `--text-accent`.
Mobile: one column — a date/size row in 11px, then title, then filename, then tags. Tap target is
the whole row, minimum 44px tall.
Hover: title → `--text-accent`. No background change, no transform.

### 7.9 `CodeBlock.astro`
Props: `filename`, `lang`, `code`, `showLineNumbers` (default true).
Header strip: filename left, `[ COPY ]` right, both 11px `--text-muted`, bottom border
`--border-hairline`. Body on `--surface-code`, `--text-sm`, `--leading-code`, line numbers in
`--text-muted`, comments in `--text-faint`, string/value runs in `--text-accent`.

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
`finished` → `--border-strong`, `opacity: .8`, `[x] MAR` label beneath.
Grid: 4-up desktop / 2-up mobile for reading; 6-up desktop / 3-up mobile for finished.

### 7.13 `Outline.astro`
Props: `headings` (`{depth, text, slug}[]`), `activeSlug`.
Desktop: sticky rail, 11px `OUTLINE` label, entries rendered with their markdown prefix — `## The
problem` — active entry in `--text-accent`.
Mobile: a bordered disclosure under the post title, collapsed by default.

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

### 7.16 `Prose.astro`
Wraps rendered markdown. Caps at `--measure`. Styles `h2` as `--text-lg --text-accent` prefixed with
`##`, `p` as `--text-body` with `--space-5` between, `a` as `--text-accent` with a 1px underline that
becomes solid accent on hover, `ul/ol` with `–` and `01.` markers, `blockquote` with a left 2px
accent rule.

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
| `/reading/` | `ls reading/ --status=open` | `SectionRule` + `BookCover` grids, reading then finished by year |
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
- The command palette traps focus, closes on Escape, and is reachable from a visible control on
  mobile (the menu button), not only from ⌘K.

---

## 11. Glyph allowlist

Departure Mono has 775 glyphs; several obvious pictographs are **not** among them and fall back to
a system sans, which is instantly visible next to pixel type.

**Safe:** `░ ▒ ▓ █` · `▲ ▼` · `← → ↑ ↓ ↗` · `⌘` · `§` · `·` · box drawing (`─ │ ┌ ┐ └ ┘ ├ ┤`) · all
Latin, Greek, small caps, old-style numerals, fractions.

**Not in the font — never use:** `● ▶ ▚ ✓ ★ ⧉ ≡ ✕ ⚠`

Substitutions this design uses: status dot → `█`; done → `[x]`; play/newest → `>>`; section marker →
`▓▒░`; copy → `[ COPY ]`; hamburger → three CSS bars, not a glyph.

When in doubt, measure: render the candidate and an `M` at 100px and compare `getBoundingClientRect().width`.
A mismatch against the font's 64px advance means it fell back.

---

## 12. Licensing

Departure Mono © Helena Zhang, SIL Open Font License 1.1. Free for commercial use; ships with the
site. Download the woff2 from departuremono.com, put it in `public/fonts/`, and keep the OFL text
alongside it. The mockups load a third-party jsDelivr mirror purely for preview — do not ship that.

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

- The ⌘K palette is drawn as a hint only; its overlay design does not exist yet.
- The About page uses placeholder employers and dates.
- Repo stats on `/src/` are hardcoded in the mockup; decide whether to fetch them at build time.
- No RSS, search or pagination beyond "load older" has been designed.
