# Layout and console

Every page must fit its width and load clean.

## Sub-features

- `no-overflow` means `documentElement.scrollWidth <= clientWidth`.
- `no-console-errors` means no console error and no 4xx response for fonts, images or assets.
- `routes` covers `/`, `/posts/`, a post, `/tags/<tag>/`, `/reading/`, `/courses/`, `/system/`, `/src/`, `/about/`, `/404`.

## How to get to it (user POV)

- Open any route on a phone or a laptop.

## Driving it with Playwright

- **Sweep.** Open each route at 390, 768, 1024 and 1440. Check overflow and read console messages.
- **Proof.** `pnpm exec playwright test layout console` passes in the `desktop`, `mobile`, `tablet` and `laptop` projects.

## Gotchas

- `/404` must return 404, not 200. `pnpm exec serve` may differ from Cloudflare here. Say so in the proof.
- An ASCII banner may run wide inside its own box only.
