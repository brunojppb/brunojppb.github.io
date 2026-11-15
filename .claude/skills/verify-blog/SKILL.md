---
name: verify-blog
description: Starts the built bpaulino.com Astro site and drives it like a reader with Playwright, mainly the Ctrl+K search palette, then saves screenshots at 390 and 1440 and the console errors. Use to prove a change to the blog, its palette, or its pages works in the real built site.
---

# Verify the blog

The surface is a static website. A reader opens pages in a browser and presses Ctrl+K to search.
Always test the build. Never test `astro dev`. The dev server hides bugs that the build shows.

All commands run from the repo root. All helpers live in `.claude/skills/verify-blog/scripts/`.

## Launch

```bash
.claude/skills/verify-blog/scripts/launch.sh
```

The script builds the site, then runs `npx serve dist -p 4321` in the background. It saves the pid in `.state/serve.pid`.
It prints `ready: http://localhost:4321` when `/pagefind/pagefind.js` answers. That file is the palette's search code, so ready means the palette can work.
The build takes about a minute.

Port 4321 is the only port. Two servers cannot run side by side. If something already listens on 4321, the script stops and says so. Do not kill it. Ask the owner.

## Doctor

```bash
.claude/skills/verify-blog/scripts/doctor.sh
```

It is read-only. Run it first when anything looks wrong. It checks four things: the saved pid is alive, port 4321 has a listener, `dist` is not older than `src`, `dist/pagefind/pagefind.js` exists, and the server reports indexed pages.
Exit 0 means the instance is worth driving. A stale `dist` means rebuild with `launch.sh`.

## Drive

```bash
node .claude/skills/verify-blog/scripts/drive-palette.mjs            # query = dev
node .claude/skills/verify-blog/scripts/drive-palette.mjs "docker"   # your own query
node .claude/skills/verify-blog/scripts/drive-palette.mjs --miss     # a miss: `haskell`, no post has it
```

The script runs Chromium at 1440 and at 390 wide. At each width it does these steps:

1. Open `/posts/`. Wait until the `CommandPalette` island loses its `ssr` attribute. Before that, Ctrl+K does nothing.
2. Press `Control+k`. Wait for `[role=dialog]` and the first `[role=option]`. Screenshot the empty state.
3. Type the query into `[role=combobox]`. Wait for `[role=group]` (or the "no matches" text with `--miss`).
4. Read every `[role=option]` row, every group label and count, the chrome count, and the `[role=status]` text.
5. Press Escape and check the dialog is gone.

Exit code 1 means a console error, a response of 400 or more, a dialog that stayed open, or zero rows on a hit.

For other pages, use the Playwright MCP tools or a short script. The per-route list is in `docs/verification.md`. The width sweep is 390, 768, 1024, 1440.
Keyboard behavior of the palette (arrows, Tab filter, Backspace, focus return) is covered by `tests/e2e/palette.spec.ts`. Run it with `npx playwright test palette` after a palette change. Note that `playwright.config.ts` builds and serves on 4321 itself and refuses a server already there. Run `cleanup.sh` first.

## Evidence

Each drive writes `runs/<UTC stamp>/` inside this skill folder:

- `1440-1-open.png`, `1440-2-query.png`, `390-1-open.png`, `390-2-query.png`
- `report.json` with the rows, groups, chrome count, console errors, and bad responses

A proof must show the action and the result: the open screenshot, the query screenshot, and the rows in `report.json`.
Read the screenshots. A passing exit code is not proof of a correct layout. Check that the selected row has a left bar, not a filled block, and that no glyph falls back to a system font.
Use the real path: the real key press, the built `dist`, the real `/pagefind/` index. Do not call internal setters or mock the index.
`runs/` is ignored by git and cleanup never deletes it.

## Cleanup

```bash
.claude/skills/verify-blog/scripts/cleanup.sh
```

It stops only the server this skill started, by its saved pid. It never kills by process name. Evidence in `runs/` stays.

## Gotchas

- The chrome count (`8 MATCHES`, `EXIT 1`, `N INDEXED`) is hidden below 640px. At 390 the `[role=status]` text (`8 results`) carries the count. The script reads both.
- Post body text is in the index. A word found only in a body shows `matched <word> in body`. `kubernetes` is one such word.
- Pagefind answers an unknown word with a shorter indexed word. The palette guards against that, so `haskell` must give `EXIT 1`. If it lists posts, the guard broke.
- `astro dev` has no `/pagefind/` index. The palette shows `EXIT 2` there, so drive the build.
- Each group shows at most 5 posts, 3 tags, 3 pages. The rule on the right of a group label shows the full total, so `POSTS07` with 5 rows is correct.
- `Meta+k` also works, but headless Linux Chromium treats Meta oddly. Use `Control+k`.
- If the palette roles or labels change, update the script and `features/search.md`.

## Feature map

See `features/README.md`.
