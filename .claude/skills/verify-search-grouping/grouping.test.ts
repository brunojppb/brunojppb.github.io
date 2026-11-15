import { describe, it, expect } from 'vitest';
import type { Filter, Group, PostHits, TagEntry } from '../../../src/lib/search';

// SEARCH_MODULE lets scripts/mutants.sh run these checks against a broken copy.
const mod = await import(process.env.SEARCH_MODULE ?? '../../../src/lib/search.ts');
const composeGroups: (input: { query: string; filter: Filter; posts: PostHits; tags: readonly TagEntry[] }) => Group[] =
  mod.composeGroups;
const PAGES: readonly { label: string; title: string; description: string; url: string }[] = mod.PAGES;

const CAPS = { POSTS: 5, TAGS: 3, PAGES: 3 } as const;
const ORDER = ['POSTS', 'TAGS', 'PAGES'];
const FILTERS: Filter[] = ['all', 'posts', 'tags', 'pages'];
const FILTER_LABEL = { posts: 'POSTS', tags: 'TAGS', pages: 'PAGES' } as const;

/** Seeded generator, so a failure reproduces. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = ['alpha', 'beta', 'ALPHA', 'alphabet', 'gamma', 'src'];
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];

/** Pagefind's answer: any true total, and the first rows the shell loaded (at least min(total, 5)). */
function makePosts(r: () => number): PostHits {
  const total = Math.floor(r() * 40);
  const loaded = Math.min(total, CAPS.POSTS + Math.floor(r() * 3));
  return {
    total,
    rows: Array.from({ length: loaded }, (_, i) => ({
      post: { kind: 'post' as const, title: `p${i}`, url: `/entries/p${i}/`, date: '2025-03-01', tags: [] },
      matchedIn: pick(r, ['title', 'tag', 'description', 'body'] as const),
    })),
  };
}

function makeTags(r: () => number): TagEntry[] {
  return Array.from({ length: Math.floor(r() * 12) }, (_, i) => ({
    kind: 'tag' as const,
    label: pick(r, WORDS),
    url: `/tags/t${i}/`,
    count: 1 + Math.floor(r() * 9),
  }));
}

const QUERIES = ['alpha', 'ALPHA', ' alpha ', 'a', 'gamma', 'zzz', 'src', 'o', 'post', '', '   '];
const CASES = 4000;

/** Runs `check` over every generated input, query and filter. */
function forAll(
  check: (input: { query: string; filter: Filter; posts: PostHits; tags: TagEntry[] }, groups: Group[]) => void
) {
  const r = rng(20260101);
  for (let n = 0; n < CASES; n++) {
    const posts = makePosts(r);
    const tags = makeTags(r);
    for (const query of QUERIES)
      for (const filter of FILTERS) {
        const input = { query, filter, posts, tags };
        check(input, composeGroups(input));
      }
  }
}

describe('result grouping and caps', () => {
  it('a blank query returns no groups', () => {
    forAll(({ query }, groups) => {
      if (query.trim() === '') expect(groups).toEqual([]);
    });
  });

  it('groups come in the order POSTS, TAGS, PAGES and are never empty', () => {
    forAll((_i, groups) => {
      const labels = groups.map((g) => g.label);
      expect(labels).toEqual(ORDER.filter((l) => labels.includes(l as never)));
      for (const g of groups) expect(g.total).toBeGreaterThan(0);
    });
  });

  it('each group shows min(total, cap) rows and never more than the cap', () => {
    forAll((_i, groups) => {
      for (const g of groups) expect(g.results.length).toBe(Math.min(g.total, CAPS[g.label]));
    });
  });

  it('every shown row belongs to its group, and no row repeats', () => {
    const kindOf = { POSTS: 'post', TAGS: 'tag', PAGES: 'page' };
    forAll((_i, groups) => {
      for (const g of groups) {
        const urls = g.results.map((x) => x.entry.url);
        expect(new Set(urls).size).toBe(urls.length);
        for (const x of g.results) expect(x.entry.kind).toBe(kindOf[g.label]);
      }
    });
  });

  it('a filter keeps only its own group and leaves that group unchanged', () => {
    forAll((input, groups) => {
      if (input.filter === 'all') return;
      const all = composeGroups({ ...input, filter: 'all' });
      expect(groups).toEqual(all.filter((g) => g.label === FILTER_LABEL[input.filter as keyof typeof FILTER_LABEL]));
    });
  });

  it('the cap hides rows but never changes the total', () => {
    forAll((input, groups) => {
      if (input.filter !== 'all') return;
      for (const g of groups) {
        const filter = Object.entries(FILTER_LABEL).find(([, l]) => l === g.label)![0] as Filter;
        expect(composeGroups({ ...input, filter })[0].total).toBe(g.total);
      }
    });
  });
});

describe('totals', () => {
  const has = (s: string, q: string) => s.toLowerCase().includes(q);

  it('the posts total is the count Pagefind gave, never the shown rows', () => {
    forAll((input, groups) => {
      if (input.query.trim() === '' || input.filter === 'tags' || input.filter === 'pages') return;
      expect(groups.find((g) => g.label === 'POSTS')?.total ?? 0).toBe(input.posts.total);
    });
  });

  it('the tags total counts exactly the tags whose label holds the query', () => {
    forAll((input, groups) => {
      const q = input.query.trim().toLowerCase();
      if (!q || input.filter === 'posts' || input.filter === 'pages') return;
      const expected = input.tags.filter((t) => has(t.label, q)).length;
      expect(groups.find((g) => g.label === 'TAGS')?.total ?? 0).toBe(expected);
    });
  });

  it('the pages total counts exactly the pages whose label, title or description holds the query', () => {
    forAll((input, groups) => {
      const q = input.query.trim().toLowerCase();
      if (!q || input.filter === 'posts' || input.filter === 'tags') return;
      const expected = PAGES.filter((p) => has(p.label, q) || has(p.title, q) || has(p.description, q)).length;
      expect(groups.find((g) => g.label === 'PAGES')?.total ?? 0).toBe(expected);
    });
  });
});
