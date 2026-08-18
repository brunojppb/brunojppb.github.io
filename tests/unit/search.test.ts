import { describe, it, expect } from 'vitest';
import {
  search,
  highlightParts,
  postFilename,
  recentPosts,
  topTags,
  type Entry,
} from '../../src/lib/search';

const post = (
  title: string,
  description: string,
  date: string,
  tags: string[] = ['devops']
): Entry => ({
  kind: 'post',
  title,
  description,
  url: `/entries/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
  date,
  tags,
});

const INDEX: Entry[] = [
  post('HTTPS for your homelab', 'Local network speeds', '2026-04-19', ['security', 'homelab']),
  post('Distributed locks in Node.js', 'Redis and DNS lookups', '2023-07-23', ['typescript']),
  post('Taming ambiguity', 'How to lead without a spec', '2024-11-02', ['leadership', 'homelab']),
  post('Dev previews', 'Every branch gets a homelab URL', '2025-03-26', ['devops']),
  { kind: 'tag', label: 'homelab', url: '/tags/homelab/', count: 2 },
  { kind: 'tag', label: 'leadership', url: '/tags/leadership/', count: 8 },
  { kind: 'tag', label: 'devops', url: '/tags/devops/', count: 5 },
  { kind: 'page', label: 'src/', title: 'Open Source', description: 'Homelab configs and tools', url: '/src/' },
  { kind: 'page', label: 'about.md', title: 'About', description: 'Who I am', url: '/about/' },
];

describe('search', () => {
  it('returns nothing for an empty query', () => {
    expect(search(INDEX, '')).toEqual([]);
    expect(search(INDEX, '   ')).toEqual([]);
  });

  it('groups results as POSTS, TAGS then PAGES', () => {
    expect(search(INDEX, 'homelab').map((g) => g.label)).toEqual(['POSTS', 'TAGS', 'PAGES']);
  });

  it('omits a group with no matches', () => {
    expect(search(INDEX, 'ambiguity').map((g) => g.label)).toEqual(['POSTS']);
  });

  it('matches regardless of case', () => {
    const urls = (q: string) => search(INDEX, q).flatMap((g) => g.results.map((r) => r.entry.url));
    expect(urls('HOMELAB')).toEqual(urls('homelab'));
  });

  it('ranks a title match above a tag match, and a tag match above a description', () => {
    const posts = search(INDEX, 'homelab')[0];
    expect(posts.results.map((r) => [r.entry.url, r.matchedIn])).toEqual([
      ['/entries/https-for-your-homelab/', 'title'],
      ['/entries/taming-ambiguity/', 'tag'],
      ['/entries/dev-previews/', 'description'],
    ]);
  });

  it('orders newest first inside one rank', () => {
    const index = [post('DNS one', 'x', '2020-01-01'), post('DNS two', 'x', '2024-01-01')];
    expect(search(index, 'dns')[0].results.map((r) => r.entry.url)).toEqual([
      '/entries/dns-two/',
      '/entries/dns-one/',
    ]);
  });

  it('reports the term that matched', () => {
    expect(search(INDEX, 'DNS')[0].results[0].term).toBe('DNS');
  });

  it('matches a tag by its label only', () => {
    const tags = search(INDEX, 'leader').find((g) => g.label === 'TAGS');
    expect(tags?.results.map((r) => r.entry.url)).toEqual(['/tags/leadership/']);
  });

  it('matches a page by label, title or description', () => {
    expect(search(INDEX, 'src/').find((g) => g.label === 'PAGES')?.results).toHaveLength(1);
    expect(search(INDEX, 'open sou').find((g) => g.label === 'PAGES')?.results).toHaveLength(1);
    expect(search(INDEX, 'configs').find((g) => g.label === 'PAGES')?.results).toHaveLength(1);
  });

  it('caps posts at five, tags and pages at three, and still reports the true total', () => {
    const many: Entry[] = [
      ...Array.from({ length: 7 }, (_, i) => post(`dns post ${i}`, 'x', `202${i}-01-01`)),
      ...Array.from({ length: 4 }, (_, i) => ({
        kind: 'tag' as const, label: `dns${i}`, url: `/tags/dns${i}/`, count: i,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        kind: 'page' as const, label: `dns${i}/`, title: 'x', description: 'y', url: `/dns${i}/`,
      })),
    ];
    const groups = search(many, 'dns');
    expect(groups.map((g) => [g.label, g.results.length, g.total])).toEqual([
      ['POSTS', 5, 7],
      ['TAGS', 3, 4],
      ['PAGES', 3, 4],
    ]);
  });

  it('narrows to one group under a filter', () => {
    expect(search(INDEX, 'homelab', 'tags').map((g) => g.label)).toEqual(['TAGS']);
    expect(search(INDEX, 'homelab', 'posts').map((g) => g.label)).toEqual(['POSTS']);
    expect(search(INDEX, 'homelab', 'pages').map((g) => g.label)).toEqual(['PAGES']);
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

describe('recentPosts', () => {
  it('gives the three newest posts, newest first', () => {
    expect(recentPosts(INDEX).map((p) => p.date)).toEqual(['2026-04-19', '2025-03-26', '2024-11-02']);
  });
});

describe('topTags', () => {
  it('gives the three highest-count tags', () => {
    expect(topTags(INDEX).map((t) => t.label)).toEqual(['leadership', 'devops', 'homelab']);
  });
});
