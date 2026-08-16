# CLAUDE.md — bpaulino.com

Personal blog. Astro, static, Tailwind v4, Cloudflare Pages. The visual language is **CONSOLE** —
a dark, monospaced, terminal-shaped design system. The full spec is in `docs/design-system.md`;
the values are in `src/styles/theme.css`.

## Standing rules

**The design is decided.** Reproduce it; do not improve it. If something is missing, ask — do not
improvise in a different visual language.

**One font, one weight.** Departure Mono, 400. No `font-bold`, no `<strong>` styled heavier, no
second typeface. Emphasis is `text-accent-lift`, an inverted fill, a leading `█`, or uppercase with
`tracking-label`.

**Type sizes are multiples of 11 or 5.5** — the pixel grid the face is drawn on. Use the `text-*`
tokens. Never 14, 18 or 24px.

**Radius 0, no shadows.** Depth is a 1px border. Both Tailwind scales are deleted on purpose.

**No arbitrary Tailwind values where a token exists.** `text-[#a98bf5]` and `p-[30px]` are failures.

**`text-accent` is a fill; `text-accent-lift` is the accent as text.** Getting these backwards is
the most common mistake in this system.

**Check glyphs against the allowlist** in the spec before using any symbol. `● ▶ ✓ ★ ≡ ⧉ ✕ ⚠` are
not in the font and fall back to a system sans. `░ ▒ ▓ █ ▲ ▼ ← → ↑ ↓ ↗ ⌘ §` are genuine.

**Code blocks emit one block element per line.** Newlines between inline elements are not reliable.

**`.astro` by default.** React islands only for `CopyButton` and `OutlineDisclosure`. Adding a
third island needs a reason.

**Post URLs never change.** They are indexed and linked. Section pages may move with a 301 in
`public/_redirects`.

**Body copy is 16.5px at every width.** The frame shrinks on mobile; the text does not.

**Motion is two ambient animations** — the scanline overlay and the caret — and both stop under
`prefers-reduced-motion: reduce`. No page transitions, no scroll animation, no hover transitions.

**Dark only.** There is no theme toggle. The old site had one; this one does not.

## Content voice

First person, plain, specific. Sentence case for prose; lowercase for anything imitating shell
output; uppercase only for 11px labels. Counts are always shown. No emoji, no exclamation marks,
no marketing voice. The user's own copy — course descriptions, post text — is reproduced verbatim
and never rewritten or shortened.

## Working

```bash
npm run dev
npm run build && npx serve dist -p 4321   # verify against the build, not the dev server
astro check
```

Verify visually at 390 and 1440 with Playwright before calling any page done. The full check list
is in `docs/verification.md`.
