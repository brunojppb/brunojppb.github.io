import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/** Renders a byte count as the fake file size shown in listings. */
export function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))}k`;
}

/** Renders a date as YYYY-MM-DD, the form used in listings and chrome. */
export function formatListDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Renders a date as `2026 APR 19`, the form used in post meta. */
export function formatProseDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()} ${MONTHS[d.getUTCMonth()]} ${day}`;
}

// 220 wpm — the middle of the conventional 200-230 wpm silent-reading
// range. Not tuned to match any particular post's placeholder mockup value.
const WORDS_PER_MINUTE = 220;

/** Renders a post's raw markdown body as a reading time, e.g. `11 MIN`. */
export function formatReadingTime(body: string): string {
  const words = body
    .replace(/```[\s\S]*?```/g, '') // code reads at a different pace than prose
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return `${minutes} MIN`;
}

/** Groups posts into years, newest year first, newest post first inside each year. */
export function groupByYear<T extends { data: { date: Date } }>(posts: T[]) {
  const byYear = new Map<number, T[]>();
  for (const p of posts) {
    const y = p.data.date.getUTCFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(p);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, list]) => ({
      year,
      posts: list.sort((a, b) => b.data.date.getTime() - a.data.date.getTime()),
    }));
}

/**
 * Posts sharing a tag with `post`, most shared tags first, then most
 * recent. Excludes `post` itself and any post with zero shared tags —
 * there is no fallback list, so a post with no tag-mates gets none back.
 */
export function relatedPosts<T extends { id: string; data: { tags: readonly string[]; date: Date } }>(
  post: T,
  posts: T[],
  limit = 3
): T[] {
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      post: p,
      shared: p.data.tags.filter((t) => post.data.tags.includes(t)).length,
    }))
    .filter((r) => r.shared > 0)
    .sort((a, b) => b.shared - a.shared || b.post.data.date.getTime() - a.post.data.date.getTime())
    .slice(0, limit)
    .map((r) => r.post);
}

/** All published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
