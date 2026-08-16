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

/** All published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}
