import { describe, it, expect, vi } from 'vitest';
import {
  runSearch,
  searchPosts,
  toPostEntry,
  type Fragment,
  type PagefindModule,
  type SearchSession,
} from '../../src/lib/pagefind';
import type { PostHits } from '../../src/lib/search';

const fragment = (slug: string, content: string, over: Partial<Fragment> = {}): Fragment => ({
  url: `/entries/${slug}/`,
  content,
  meta: { title: `Title ${slug}`, description: '' },
  filters: { date: ['2026-01-01'], tag: ['devops'] },
  ...over,
});

interface FakeHit {
  slug: string;
  content: string;
  fields?: string[];
}

/** A Pagefind stand-in: every plain query returns `plain`, a quoted query returns the `exact` count. */
function fake(plain: FakeHit[], exact: Record<string, number> = {}) {
  const data = vi.fn();
  const search = vi.fn(async (term: string | null) => {
    if (term !== null && term.startsWith('"')) {
      const word = term.slice(1, -1);
      return { results: Array.from({ length: exact[word] ?? 0 }, () => ({ score: 1, data: async () => ({}) })) };
    }
    return {
      results: plain.map((h, i) => ({
        score: 10 - i,
        matchedMetaFields: h.fields,
        data: async () => {
          data(h.slug);
          return fragment(h.slug, h.content);
        },
      })),
    };
  });
  const pf = { init: vi.fn(), filters: vi.fn(), search } as unknown as PagefindModule;
  return { pf, data, search };
}

const live = () => new AbortController().signal;

describe('toPostEntry', () => {
  it('reads title, path, date and tags from a fragment', () => {
    expect(toPostEntry(fragment('a', ''))).toEqual({
      kind: 'post',
      title: 'Title a',
      url: '/entries/a/',
      date: '2026-01-01',
      tags: ['devops'],
    });
  });

  it('falls back to the slug and empty fields when the fragment lacks them', () => {
    expect(toPostEntry({ url: 'http://x.test/entries/slug-only/' })).toEqual({
      kind: 'post',
      title: 'slug-only',
      url: '/entries/slug-only/',
      date: '',
      tags: [],
    });
  });
});

describe('searchPosts', () => {
  it('returns the true total, loads only the first rows and ranks by field', async () => {
    const { pf, data } = fake([
      { slug: 'body', content: 'deployment notes' },
      { slug: 'tag', content: 'deployment notes', fields: ['tags'] },
      { slug: 'title', content: 'deployment notes', fields: ['title'] },
    ]);
    const found = (await searchPosts(pf, 'deploy', 2, live())) as PostHits;
    expect(found.total).toBe(3);
    expect(found.rows.map((r) => [r.post.url, r.matchedIn])).toEqual([
      ['/entries/title/', 'title'],
      ['/entries/tag/', 'tag'],
    ]);
    expect(data).toHaveBeenCalledTimes(2);
  });

  it('treats a word that only a shorter word supports as a miss', async () => {
    const { pf } = fake([{ slug: 'a', content: 'It has a cost' }], { haskell: 0 });
    expect(await searchPosts(pf, 'haskell', 5, live())).toEqual({ total: 0, rows: [] });
  });

  it('keeps an inflection that has an exact match', async () => {
    const { pf } = fake([{ slug: 'a', content: 'We keep deploying' }], { deploys: 3 });
    const found = (await searchPosts(pf, 'deploys', 5, live())) as PostHits;
    expect(found.total).toBe(1);
  });

  it('skips the exact search when every word has support', async () => {
    const { pf, search } = fake([{ slug: 'a', content: 'deployment' }]);
    await searchPosts(pf, 'deplo', 5, live());
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('returns null and loads no fragment when the signal aborts during search', async () => {
    const ctl = new AbortController();
    const { pf, data } = fake([{ slug: 'a', content: 'x' }]);
    const run = searchPosts(pf, 'x', 5, ctl.signal);
    ctl.abort();
    expect(await run).toBeNull();
    expect(data).not.toHaveBeenCalled();
  });
});

describe('runSearch', () => {
  const session = (posts: SearchSession['posts']): SearchSession => ({
    catalog: { postCount: 1, recent: [], tags: [{ kind: 'tag', label: 'devops', url: '/tags/devops/', count: 6 }] },
    posts,
  });

  it('returns no groups for a blank query without searching', async () => {
    const posts = vi.fn();
    expect(await runSearch(session(posts), '  ', 'all', live())).toEqual([]);
    expect(posts).not.toHaveBeenCalled();
  });

  it('does not search posts under the tags filter', async () => {
    const posts = vi.fn();
    const groups = await runSearch(session(posts), 'dev', 'tags', live());
    expect(posts).not.toHaveBeenCalled();
    expect(groups?.map((g) => g.label)).toEqual(['TAGS']);
  });

  it('returns null when the posts call resolves null', async () => {
    expect(await runSearch(session(async () => null), 'dev', 'all', live())).toBeNull();
  });

  it('returns null when the signal aborted before the posts resolved', async () => {
    const ctl = new AbortController();
    const slow = session(async () => {
      ctl.abort();
      return { total: 0, rows: [] };
    });
    expect(await runSearch(slow, 'dev', 'all', ctl.signal)).toBeNull();
  });
});
