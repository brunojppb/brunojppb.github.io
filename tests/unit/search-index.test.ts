import { describe, it, expect } from 'vitest';
import { GET } from '../../src/pages/search-index.json';
import { TAG_ORDER } from '../../src/lib/tags';
import { TABS } from '../../src/lib/nav';
import type { Entry } from '../../src/lib/search';

const response = await GET({} as never);
const json = await response.text();
const entries: Entry[] = JSON.parse(json);

const of = <K extends Entry['kind']>(kind: K) =>
  entries.filter((e): e is Extract<Entry, { kind: K }> => e.kind === kind);

describe('/search-index.json', () => {
  it('is served as JSON', () => {
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('indexes every published post', () => {
    expect(of('post')).toHaveLength(30);
  });

  it('indexes every tag with its post count', () => {
    const tags = of('tag');
    expect(tags).toHaveLength(TAG_ORDER.length);
    for (const tag of tags) {
      expect(tag.url).toBe(`/tags/${tag.label}/`);
      expect(tag.count).toBeGreaterThan(0);
    }
  });

  it('indexes the six pages of the tab bar', () => {
    expect(of('page').map((p) => p.url)).toEqual(TABS.map((t) => t.href));
  });

  it('points every post at its entry URL and dates it YYYY-MM-DD', () => {
    for (const post of of('post')) {
      expect(post.url).toMatch(/^\/entries\/[a-z0-9-]+\/$/);
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.tags.length).toBeGreaterThan(0);
    }
  });

  it('carries no post body', () => {
    for (const entry of entries) expect(entry).not.toHaveProperty('body');
  });

  it('stays well under the 60 kB budget', () => {
    expect(new TextEncoder().encode(json).length).toBeLessThan(20_000);
  });
});
