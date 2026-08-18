import type { APIRoute } from 'astro';
import { getPosts } from '../lib/posts';
import { tagCounts } from '../lib/tags';
import { buildIndex } from '../lib/search-index';

/**
 * The ⌘K palette's index, written to /search-index.json at build time. The
 * palette fetches it on first open, so it must never be inlined into a page.
 */
export const GET: APIRoute = async () => {
  const posts = await getPosts();

  return new Response(JSON.stringify(buildIndex(posts, tagCounts(posts))), {
    headers: { 'Content-Type': 'application/json' },
  });
};
