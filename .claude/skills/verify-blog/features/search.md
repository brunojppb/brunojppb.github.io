# Search palette

The palette finds posts, tags and pages by title, description, tag and post body, through Pagefind. It opens over any page.

## Sub-features

- `open` opens with Ctrl+K, Meta+K, `/` outside a field, or a `[data-palette-open]` button in the chrome.
- `empty-state` shows `N INDEXED`, a RECENT list of posts, and JUMP TO chips for the tabs.
- `match` shows groups POSTS, TAGS, PAGES with caps 5, 3, 3 and the full total beside each label.
- `miss` shows `EXIT 1`, the line `grep: <term>: no matches in N files`, and the top tags.
- `navigate` moves with the arrow keys, opens with Enter, and cycles the group filter with Tab.
- `close` closes on Escape, on Backspace with an empty query, on the backdrop, and returns focus to the trigger.

## How to get to it (user POV)

- Press Ctrl+K or Cmd+K on any page.
- Press `/` while focus is outside a text field.
- Tap SEARCH in the chrome bar on a phone.

## Driving it with Playwright

Preconditions: `launch.sh` printed `ready`, and `doctor.sh` exits 0.

- **Open and match.** Run `node .claude/skills/verify-blog/scripts/drive-palette.mjs`. At 1440 and 390 the report lists rows under POSTS and TAGS. `chromeCount` reads `N MATCHES` and `announced` reads `N results`.
- **Miss.** Run the same script with `--miss`. `chromeCount` reads `EXIT 1`, and the rows are the top tag chips.
- **Keyboard walk.** Run `npx playwright test palette` (after `cleanup.sh`). It covers arrows, Tab, Enter, Backspace, Escape and focus return.
- **Proof.** Read `runs/<stamp>/1440-2-query.png` and `390-2-query.png`. The query appears after `$ grep`, groups show highlighted matches, and one row has a left bar.

## Gotchas

- Wait for the island to hydrate (`ssr` attribute gone) before the first key press, or the key does nothing.
- The count is hidden below 640px. Read `[role=status]` there.
- Caps hide rows, not totals. `POSTS07` over 5 rows is right.
- Body text is indexed. A body-only hit reads `matched <word> in body`.
- A word no post holds, such as `haskell`, must show `EXIT 1`.
