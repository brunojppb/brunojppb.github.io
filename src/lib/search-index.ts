import { formatListDate } from './posts';
import { TABS } from './nav';
import type { Entry } from './search';

/** The post fields the index carries. Narrow on purpose: no body, no front matter. */
export interface IndexedPost {
  id: string;
  data: { title: string; description: string; date: Date; tags: readonly string[] };
}

/**
 * Builds the ⌘K palette's index from posts and their tag counts. Pure, so a
 * unit test can exercise it without a content collection.
 */
export function buildIndex(posts: IndexedPost[], counts: Map<string, number>): Entry[] {
  return [
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
}
