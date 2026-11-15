# Post listing

`/posts/` lists every post grouped by year. Tag pages list posts by tag.

## Sub-features

- `year-groups` groups rows under year headings, newest first.
- `tag-counts` shows a count per tag that matches the collection.
- `tag-page` serves `/tags/<tag>/` for every tag in use.

## How to get to it (user POV)

- Open `/posts/` from the tab bar.
- Follow a tag link from a post or from the palette.

## Driving it with Playwright

- **Counts.** Open `/posts/` and `/tags/leadership/` at 1440 and 390. Compare the tag count shown with the number of rows on the tag page.
- **Tap targets.** At 390 every link in a listing row must be at least 44px tall.
- **Proof.** `npx playwright test listing` passes, and screenshots at both widths show year headings in order.

## Gotchas

- `/tags/<tag>/` must exist for every tag in the index. A missing page is a 404 and a console error.
- Run `npx playwright test` only after `cleanup.sh`. The config starts its own server on 4321.
