# bpaulino.com

Hi there! Welcome to my digital garden. This website is a collection of some of
my experiences as a software engineer.

## Architecture

This blog is built with [Maudit](https://maudit.org/), a Rust-based static site
generator. The site is structured as a standard Rust binary that uses Maudit as a
library:

- **Templating:** [Maud](https://maud.lambda.xyz/) (Rust macro-based HTML)
- **Content:** Markdown files with YAML frontmatter
- **Styling:** Plain CSS processed and bundled by [Rolldown](https://rolldown.rs/)
- **JavaScript:** Vanilla JS (particles, theme switcher, reading progress, GoodReads integration)
- **Syntax highlighting:** [Syntect](https://github.com/trishume/syntect) (built-in, at build time)
- **Analytics:** [GoatCounter](https://www.goatcounter.com/) (privacy-first)

### Project structure

```
.
├── Cargo.toml              # Rust project manifest
├── src/
│   ├── main.rs             # Entry point: routes, content sources, build options
│   ├── content.rs          # Markdown entry types (ArticleContent, PageContent)
│   ├── layout.rs           # Shared HTML layout with SEO meta tags
│   └── routes/             # One file per route
│       ├── index.rs        # Homepage (post listing)
│       ├── article.rs      # Blog posts (/entries/[slug])
│       ├── about.rs        # About page
│       ├── courses.rs      # Courses page
│       ├── reading.rs      # Reading list (GoodReads)
│       ├── open_source.rs  # Open-source projects
│       ├── not_found.rs    # 404 page
│       ├── feed.rs         # RSS feed (/feed.xml)
│       ├── work.rs         # Redirect to /about
│       └── hidden.rs       # Hidden posts (/hidden/[slug])
├── content/
│   ├── articles/           # Blog posts (Markdown)
│   └── pages/              # Static pages (Markdown with inline HTML)
├── data/
│   ├── style.css           # Combined stylesheet
│   └── blog.js             # Client-side JavaScript
├── static/
│   └── assets/             # Images, favicons (copied as-is to output)
└── dist/                   # Build output (gitignored)
```

## Prerequisites

- [Rust](https://rustup.rs/) 1.85+ (stable)
- [Maudit CLI](https://maudit.org/docs/installation/):
  ```shell
  cargo install maudit-cli
  ```

## Development

Start the local dev server with auto-rebuild and live refresh:

```shell
maudit dev
```

This compiles the Rust binary, runs it, watches for file changes, and serves the
site locally. The dev server URL will be printed in the terminal output.

## Production build

```shell
maudit build
```

Output goes to `dist/`. The build includes:

- Minified and hashed CSS/JS assets
- Syntax-highlighted code blocks
- RSS feed at `/feed.xml`
- Sitemap at `/sitemap.xml`
- Prefetching for near-instant navigation

Typical build time is ~80ms (full) or ~20ms (incremental).

You can also preview the production build locally:

```shell
maudit preview
```

## Writing a new blog post

1. Create a Markdown file in `content/articles/` named after its URL slug
   (e.g. `my-new-post.md`)
2. Add YAML frontmatter:

   ```yaml
   ---
   title: "My New Post"
   date: 2025-04-04
   author: Bruno Paulino
   keywords: web,rust,programming
   meta_description: A short description for SEO and social previews.
   meta_image: /assets/images/posts/my-new-post.jpg
   ---
   ```

3. Write your content in Markdown below the frontmatter.
4. The post will automatically appear on the homepage and in the RSS feed.

The `meta_image` field is optional. If omitted, the default profile image is
used for social previews.

## Deployment

All commits to `master` trigger an integration with
[Cloudflare Pages](https://pages.cloudflare.com/) where we build and serve the
site under [bpaulino.com](https://bpaulino.com).

### Preview deployments

Any pull request opened from a branch starting with `preview-` gets deployed to
Cloudflare Pages automatically and a comment with the preview URL is posted on
the PR.

## License

This website is open-source. The content (blog posts, images) is
copyright Bruno Paulino. The source code is available on
[GitHub](https://github.com/brunojppb/brunojppb.github.io).
