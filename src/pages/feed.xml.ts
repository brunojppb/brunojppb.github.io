import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';

const SITE = 'https://bpaulino.com';

// The content migration dropped the `author` frontmatter field — the new
// posts schema (src/content.config.ts) has no such field. The old Rust
// feed (src/routes/feed.rs) read `author: Bruno` for exactly these four
// posts and defaulted every other one to "Bruno Paulino". Reproduced here
// from content/articles/*.md so the byline still matches what subscribers
// already saw.
const AUTHOR_OVERRIDES: Record<string, string> = {
  '1-ios-push-notifications-for-rails-developers': 'Bruno',
  'replace-me-at-woom': 'Bruno',
  'retrying-api-calls-with-exponential-backoff': 'Bruno',
  'taming-ambiguity': 'Bruno',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a date as RFC 822, fixed at noon UTC. Posts carry only a date,
 * no time of day, and the old feed always emitted 12:00:00 for that
 * reason — matched here rather than the post's actual (arbitrary)
 * midnight-UTC time component.
 */
function formatRfc822(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const weekday = WEEKDAYS[date.getUTCDay()];
  const month = MONTHS[date.getUTCMonth()];
  return `${weekday}, ${day} ${month} ${date.getUTCFullYear()} 12:00:00 +0000`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const posts = await getPosts();

  const items = posts
    .map((post) => {
      // No trailing slash: the old feed built this as
      // `format!("{}/entries/{}", base_url, id)`, and guid is what
      // subscribers dedupe on — reproducing the old shape, not the
      // site's current `trailingSlash: 'always'` convention.
      const link = `${SITE}/entries/${post.id}`;
      const author = AUTHOR_OVERRIDES[post.id] ?? 'Bruno Paulino';
      return [
        '    <item>',
        `      <title>${escapeXml(post.data.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid>${link}</guid>`,
        `      <description>${escapeXml(post.data.description)}</description>`,
        `      <author>${escapeXml(author)}</author>`,
        `      <pubDate>${formatRfc822(post.data.date)}</pubDate>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>bpaulino.com</title>
    <link>${SITE}</link>
    <description>I am Bruno Paulino. Software is my craft.</description>
    <language>en-us</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
