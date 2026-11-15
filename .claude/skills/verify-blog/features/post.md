# Post page

A post page shows the title, the body, code blocks, an outline rail, and previous and next links.

## Sub-features

- `outline` shows a sticky rail at 900px and wider, and a disclosure below that.
- `code-blocks` renders one element per line in each `pre`.
- `copy` copies a code block with the copy button.
- `prev-next` links to neighbours, with none past either end.

## How to get to it (user POV)

- Click a row in `/posts/`, or open a result in the palette.

## Driving it with Playwright

- **Pick a post.** Read the first `a[href^="/entries/"]` on `/posts/`.
- **Code lines.** In page context, for each `pre`, count `children` and distinct `getBoundingClientRect().top` values. They must be equal.
- **Heading order.** `h1` is the post title, not the `$ cat` prompt line.
- **Proof.** Screenshots at 1440 and 390 plus `npx playwright test codeblocks`.

## Gotchas

- A `pre` may scroll sideways inside its own box. The page itself must not.
- Post URLs never change. Do not accept a redirect on a post path.
