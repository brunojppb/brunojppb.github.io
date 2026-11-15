import { describe, it, expect } from 'vitest';
import {
  CAPS,
  composeGroups,
  highlightParts,
  matchedIn,
  matchPages,
  matchTags,
  parseFields,
  postFilename,
  queryWords,
  rankByField,
  topTags,
  unresolvedWords,
  type MetaField,
  type PostEntry,
  type PostHits,
  type TagEntry,
} from '../../src/lib/search';

const post = (n: number): PostEntry => ({
  kind: 'post',
  title: `post ${n}`,
  url: `/entries/post-${n}/`,
  date: '2026-01-01',
  tags: [],
});

const hits = (total: number, rows = total): PostHits => ({
  total,
  rows: Array.from({ length: rows }, (_, i) => ({ post: post(i), matchedIn: 'body' as const })),
});

const tag = (label: string, count: number): TagEntry => ({
  kind: 'tag',
  label,
  url: `/tags/${label}/`,
  count,
});

const TAGS = [tag('homelab', 2), tag('leadership', 8), tag('devops', 5)];
const NO_POSTS: PostHits = { total: 0, rows: [] };

describe('composeGroups', () => {
  it('returns nothing for an empty query', () => {
    expect(composeGroups({ query: '', filter: 'all', posts: hits(3), tags: TAGS })).toEqual([]);
    expect(composeGroups({ query: '   ', filter: 'all', posts: hits(3), tags: TAGS })).toEqual([]);
  });

  it('groups results as POSTS, TAGS then PAGES', () => {
    const groups = composeGroups({ query: 'src', filter: 'all', posts: hits(1), tags: [tag('srcs', 1)] });
    expect(groups.map((g) => g.label)).toEqual(['POSTS', 'TAGS', 'PAGES']);
  });

  it('drops a group with no matches', () => {
    const groups = composeGroups({ query: 'homelab', filter: 'all', posts: NO_POSTS, tags: TAGS });
    expect(groups.map((g) => g.label)).toEqual(['TAGS']);
  });

  it('caps posts at five, tags at three and pages at three, with the true totals', () => {
    const tags = Array.from({ length: 4 }, (_, i) => tag(`s${i}`, i));
    const groups = composeGroups({ query: 's', filter: 'all', posts: hits(30, 5), tags });
    const byLabel = Object.fromEntries(groups.map((g) => [g.label, [g.results.length, g.total]]));
    expect(byLabel.POSTS).toEqual([CAPS.posts, 30]);
    expect(byLabel.TAGS).toEqual([CAPS.tags, 4]);
    expect(byLabel.PAGES?.[0]).toBeLessThanOrEqual(CAPS.pages);
  });

  it('cuts posts to the cap even when more rows arrive', () => {
    const groups = composeGroups({ query: 'x', filter: 'posts', posts: hits(9, 9), tags: [] });
    expect(groups[0].results).toHaveLength(CAPS.posts);
    expect(groups[0].total).toBe(9);
  });

  it('keeps one group under a filter', () => {
    const base = { query: 'homelab', posts: hits(2), tags: TAGS };
    expect(composeGroups({ ...base, filter: 'tags' }).map((g) => g.label)).toEqual(['TAGS']);
    expect(composeGroups({ ...base, filter: 'posts' }).map((g) => g.label)).toEqual(['POSTS']);
    expect(composeGroups({ ...base, filter: 'pages' })).toEqual([]);
  });

  it('carries the term as typed', () => {
    const groups = composeGroups({ query: ' DNS ', filter: 'posts', posts: hits(1), tags: [] });
    expect(groups[0].results[0].term).toBe('DNS');
  });
});

describe('matchTags and matchPages', () => {
  it('matches a tag by label, case-insensitive, most used first', () => {
    const tags = [tag('devops', 5), tag('dev', 9), tag('leadership', 8)];
    expect(matchTags(tags, 'DEV').map((t) => t.label)).toEqual(['dev', 'devops']);
    expect(matchTags(TAGS, 'leader').map((t) => t.url)).toEqual(['/tags/leadership/']);
  });

  it('matches a page by label, title or description, title first', () => {
    expect(matchPages('src/').map((m) => m.page.url)).toEqual(['/src/']);
    expect(matchPages('open sou').map((m) => m.page.url)).toEqual(['/src/']);
    const found = matchPages('post');
    expect(found[0]).toMatchObject({ matchedIn: 'title' });
    const order = found.map((m) => m.matchedIn);
    expect(order).toEqual([...order].sort((a, b) => (a === b ? 0 : a === 'title' ? -1 : 1)));
  });
});

describe('field ranking and provenance', () => {
  const item = (id: string, fields: MetaField[]) => ({ id, fields });

  it('orders title, tags, description, then body, keeping relevance order inside a field', () => {
    const ranked = rankByField([
      item('body1', []),
      item('desc', ['description']),
      item('tag1', ['tags']),
      item('body2', []),
      item('title', ['title', 'tags']),
      item('tag2', ['tags', 'description']),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(['title', 'tag1', 'tag2', 'desc', 'body1', 'body2']);
  });

  it('names the strongest field a hit matched in', () => {
    expect(matchedIn(['description', 'tags'])).toBe('tag');
    expect(matchedIn(['title'])).toBe('title');
    expect(matchedIn(['description'])).toBe('description');
    expect(matchedIn([])).toBe('body');
  });

  it('keeps known fields and drops the rest', () => {
    expect(parseFields(['image', 'tags', 'nope', 'title'])).toEqual(['tags', 'title']);
    expect(parseFields(undefined)).toEqual([]);
  });
});

describe('word guard', () => {
  const text = (content: string, extra: Partial<{ title: string; tags: string[]; summary: string }> = {}) => ({
    title: '',
    tags: [],
    summary: '',
    content,
    ...extra,
  });

  it('folds the query into words', () => {
    expect(queryWords('  Café "Node.js!"  ')).toEqual(['cafe', 'node.js']);
  });

  it('passes a word that a hit contains as a prefix', () => {
    expect(unresolvedWords(['deplo'], [text('We love deployment pipelines')])).toEqual([]);
  });

  it('flags a word that only a shorter word supports', () => {
    expect(unresolvedWords(['haskell'], [text('It has a cost. She has time.')])).toEqual(['haskell']);
  });

  it('flags an inflection so the caller can run an exact search', () => {
    expect(unresolvedWords(['deploys'], [text('We keep deploying things')])).toEqual(['deploys']);
  });

  it('reads the title, tags and summary as well as the body', () => {
    const hit = text('nothing', { title: 'Kubernetes basics', tags: ['devops'], summary: 'Ingress' });
    expect(unresolvedWords(['kube', 'devop', 'ingre'], [hit])).toEqual([]);
  });

  it('flags only the unsupported word of a multi-word query', () => {
    expect(unresolvedWords(['every', 'branchz'], [text('every branch gets a url')])).toEqual(['branchz']);
  });
});

describe('highlightParts', () => {
  it('splits a string around every occurrence of the term', () => {
    expect(highlightParts('dnsmasq and dns', 'dns')).toEqual([
      { text: 'dns', hit: true },
      { text: 'masq and ', hit: false },
      { text: 'dns', hit: true },
    ]);
  });

  it('keeps the casing of the source, not the query', () => {
    expect(highlightParts('DNS lookups', 'dns')).toEqual([
      { text: 'DNS', hit: true },
      { text: ' lookups', hit: false },
    ]);
  });

  it('returns one plain part when the term is absent or empty', () => {
    expect(highlightParts('nothing here', 'dns')).toEqual([{ text: 'nothing here', hit: false }]);
    expect(highlightParts('nothing here', '')).toEqual([{ text: 'nothing here', hit: false }]);
  });
});

describe('postFilename', () => {
  it('renders a post URL as the markdown file it came from', () => {
    expect(postFilename('/entries/https-for-your-homelab/')).toBe('https-for-your-homelab.md');
  });
});

describe('topTags', () => {
  it('gives the three highest-count tags', () => {
    expect(topTags([...TAGS, tag('git', 1)]).map((t) => t.label)).toEqual(['leadership', 'devops', 'homelab']);
  });
});
