# bpaulino.com

Hi there! Welcome to my digital garden. This website is a collection of some of
my experiences as a software engineer.

## Architecture

The site is built with [Astro](https://astro.build/) and [Tailwind CSS v4](https://tailwindcss.com/),
and deployed static to [Cloudflare Pages](https://pages.cloudflare.com/). The
visual language is CONSOLE — a dark, monospaced, terminal-shaped design system.
The full spec is in `docs/design-system.md`; the rules for working on it are in
`CLAUDE.md`.

- **Framework:** Astro, output `static`
- **Styling:** Tailwind CSS v4, tokens in `src/styles/theme.css`
- **Interactivity:** almost none. The only React island is the code block copy
  button (`src/components/islands/CopyButton.tsx`)
- **Content:** Markdown posts with YAML frontmatter, plus YAML data files for
  courses, books and projects
- **Syntax highlighting:** Shiki, at build time
- **Analytics:** [GoatCounter](https://www.goatcounter.com/) (privacy-first)

### Project structure

```
.
├── src/
│   ├── pages/            # Routes — one file (or folder) per URL
│   ├── content/posts/    # Blog posts (Markdown)
│   ├── data/              # books.yaml, projects.yaml, courses.yaml
│   ├── components/        # chrome/, shell/, content/, listing/, media/, islands/
│   ├── layouts/           # BaseLayout.astro
│   ├── lib/               # posts, tags, books, contrast helpers
│   └── styles/theme.css   # every design token
├── public/                # Static assets served as-is, plus _redirects
├── scripts/               # check-urls.mjs, fetch-book-covers.mjs, optimize-images.mjs
├── tests/e2e/             # Playwright specs
└── dist/                  # Build output (gitignored)
```

## Development

[mise](https://mise.jdx.dev) installs Node and pnpm, locally and in CI through
`jdx/mise-action`. The versions are pinned in four places, and they must agree:

| Place | Pins | Read by |
|---|---|---|
| `mise.toml` | Node, pnpm | mise locally, and `jdx/mise-action` in CI |
| `.node-version` | Node | Cloudflare Pages, which does not read `mise.toml` |
| `package.json` `packageManager` | pnpm | pnpm itself, which refuses to run as another version |
| `PNPM_VERSION` in the Pages project settings | pnpm | Cloudflare Pages, whose docs name only this variable |

Astro 7 needs Node 22.12 or newer, and the Pages build image will not read the
version from `package.json` engines, so the second file is what keeps
production on the right runtime.

```shell
mise install
pnpm install
pnpm dev
```

Verify against a production build, not the dev server, before calling anything
done:

```shell
pnpm build && pnpm exec serve dist -p 4321
```

## Writing a new blog post

1. Add a Markdown file to `src/content/posts/`, named after its URL slug (it
   becomes `/entries/<slug>/`).
2. Add frontmatter:

   ```yaml
   ---
   title: 'My New Post'
   description: 'One sentence for SEO and social previews.'
   date: 2026-04-04
   tags: [engineering]
   lang: en
   keywords: 'optional,comma,list'
   ---
   ```

   `tags` must come from `TAG_ORDER` in `src/lib/tags.ts`. Post URLs never
   change once published — that is the one rule this build must never break.

3. Write the post in Markdown below the frontmatter. It appears on the
   homepage, `/posts/`, its tag pages, and the RSS feed automatically.

## Adding a book

Add an entry to the `reading` or `finished` array in `src/data/books.yaml`,
then pull its cover:

```shell
pnpm books:covers
```

The script reads any `isbn` in the file, fetches the cover from Open Library,
and writes it to `src/assets/books/`. It never runs as part of `pnpm build` —
the build must succeed with no network access, so covers are committed. If
Open Library has no cover for your edition, set `cover_url` to
the publisher's page directly instead of an `isbn`. A `finished` book needs a
`finished: YYYY-MM` date.

## Adding a project

Add an entry to `src/data/projects.yaml` — `slug` is the GitHub `owner/repo`.
Set `pinned: true` and write `paragraphs` for a full card; omit both for a
compact row using the repo's own GitHub description. Repo stats on `/src/`
are fetched from the GitHub API at build time, not hardcoded.

## Checks

```shell
pnpm check       # astro check — type errors in .astro files
pnpm test        # vitest — unit tests
pnpm test:e2e    # playwright — the full e2e suite, four viewports
pnpm urls:check  # confirms every post URL still resolves against a saved build
```

`pnpm test:e2e` builds the site and serves `dist/` before running, so it
exercises the real build, not the dev server.

## Deployment

All commits to `master` build and deploy to
[Cloudflare Pages](https://pages.cloudflare.com/) at
[bpaulino.com](https://bpaulino.com), with `pnpm build` as the build
command and `dist` as the output directory.

The output directory comes from `pages_build_output_dir` in `wrangler.toml`.
The build command does not: it lives in the Pages project settings, so it has
to be set there by hand. Nothing else in `wrangler.toml` is needed, because
the site is static and ships no Pages Functions.

The Pages project also needs the environment variable `PNPM_VERSION` set to
the exact pnpm version in `mise.toml`, for production and preview builds. The
[Pages build image docs](https://developers.cloudflare.com/pages/configuration/build-image/)
name only this variable for choosing pnpm, and the default is pnpm 10. They
do not say whether Pages reads `packageManager`. Plain pnpm 10 cannot switch
itself to pnpm 12, so relying on the default can stop the install. An exact
match with `packageManager` works whichever way Pages picks pnpm. Update the
variable whenever `mise.toml` changes pnpm.

### Preview deployments

Any pull request opened from a branch starting with `preview-` gets deployed
to Cloudflare Pages automatically, with a comment posting the preview URL on
the PR.

## License

This website is open-source. The content (blog posts, images) is
copyright Bruno Paulino. The source code is available on
[GitHub](https://github.com/brunojppb/brunojppb.github.io).
