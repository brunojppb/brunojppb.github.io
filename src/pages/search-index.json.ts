import type { APIRoute } from 'astro';
import { getPosts, formatListDate } from '../lib/posts';
import { tagCounts } from '../lib/tags';
import { TABS } from '../lib/nav';
import type { Entry } from '../lib/search';

/**
 * The ⌘K palette's index, written to /search-index.json at build time. The
 * palette fetches it on first open, so it must never be inlined into a page.
 */
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const counts = tagCounts(posts);

  const entries: Entry[] = [
    ...posts.map((post) => ({
      kind: 'post' as const,
      title: post.data.title,
      description: post.data.description,
      url: `/entries/${post.id}/`,
      date: formatListDate(post.data.date),
      tags: [...post.data.tags],
    })),
    ...[...counts].map(([label, count]) => ({
      kind: 'tag' as const,
      label,
      url: `/tags/${label}/`,
      count,
    })),
    ...TABS.map((tab) => ({
      kind: 'page' as const,
      label: tab.label,
      title: tab.title,
      description: tab.description,
      url: tab.href,
    })),
  ];

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
