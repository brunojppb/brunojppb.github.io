import { describe, it, expect } from 'vitest';
import { buildIndex, type IndexedPost } from '../../src/lib/search-index';
import { TABS } from '../../src/lib/nav';

// Fixtures, not the real collection: `astro:content` is empty until a build
// has synced it, and a unit test that depends on that state passes on a warm
// checkout and fails on a cold one. The real emitted file is checked in
// tests/e2e/palette.spec.ts, against a build.
const posts: IndexedPost[] = [
  {
    id: 'https-for-your-homelab',
    data: {
      title: 'HTTPS for your homelab',
      description: 'Split-horizon DNS at home',
      date: new Date('2026-04-19'),
      tags: ['security', 'homelab'],
    },
  },
  {
    id: 'dev-previews',
    data: {
      title: 'Why deployment previews?',
      description: 'Every branch gets a URL',
      date: new Date('2025-03-26'),
      tags: ['devops'],
    },
  },
];

const counts = new Map([
  ['security', 1],
  ['homelab', 1],
  ['devops', 1],
]);

const entries = buildIndex(posts, counts);
const of = <K extends (typeof entries)[number]['kind']>(kind: K) =>
  entries.filter((e): e is Extract<(typeof entries)[number], { kind: K }> => e.kind === kind);

describe('buildIndex', () => {
  it('indexes every post at its entry URL, dated YYYY-MM-DD', () => {
    expect(of('post')).toEqual([
      {
        kind: 'post',
        title: 'HTTPS for your homelab',
        description: 'Split-horizon DNS at home',
        url: '/entries/https-for-your-homelab/',
        date: '2026-04-19',
        tags: ['security', 'homelab'],
      },
      {
        kind: 'post',
        title: 'Why deployment previews?',
        description: 'Every branch gets a URL',
        url: '/entries/dev-previews/',
        date: '2025-03-26',
        tags: ['devops'],
      },
    ]);
  });

  it('indexes every tag with its count and its page', () => {
    expect(of('tag')).toEqual([
      { kind: 'tag', label: 'security', url: '/tags/security/', count: 1 },
      { kind: 'tag', label: 'homelab', url: '/tags/homelab/', count: 1 },
      { kind: 'tag', label: 'devops', url: '/tags/devops/', count: 1 },
    ]);
  });

  it('indexes the six destinations of the tab bar, in tab order', () => {
    expect(of('page').map((p) => p.url)).toEqual(TABS.map((t) => t.href));
    expect(of('page').map((p) => p.label)).toEqual(TABS.map((t) => t.label));
  });

  it('carries no post body', () => {
    for (const entry of entries) expect(entry).not.toHaveProperty('body');
  });
});
