import { describe, it, expect } from 'vitest';
import { TAG_MAP, TAG_ORDER, PT_SLUGS, tagCounts } from '../../src/lib/tags';

describe('tag vocabulary', () => {
  it('covers all 30 posts', () => {
    expect(Object.keys(TAG_MAP)).toHaveLength(30);
  });

  it('gives every post at least one tag', () => {
    for (const [slug, tags] of Object.entries(TAG_MAP)) {
      expect(tags.length, `${slug} has no tags`).toBeGreaterThan(0);
    }
  });

  it('only uses tags from the vocabulary', () => {
    const known = new Set<string>(TAG_ORDER);
    for (const [slug, tags] of Object.entries(TAG_MAP)) {
      for (const t of tags) expect(known.has(t), `${slug}: unknown tag ${t}`).toBe(true);
    }
  });

  it('uses every tag in the vocabulary at least once', () => {
    const used = new Set(Object.values(TAG_MAP).flat());
    for (const t of TAG_ORDER) expect(used.has(t), `tag ${t} is unused`).toBe(true);
  });

  it('lists tags in descending count order', () => {
    const count = (t: string) => Object.values(TAG_MAP).filter((ts) => ts.includes(t as never)).length;
    const counts = TAG_ORDER.map(count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('marks exactly six posts as Portuguese', () => {
    expect(PT_SLUGS.size).toBe(6);
    for (const s of PT_SLUGS) expect(TAG_MAP).toHaveProperty(s);
  });
});

describe('tagCounts', () => {
  const post = (tags: string[]) => ({ data: { tags } }) as never;
  it('counts posts per tag, most first', () => {
    const counts = tagCounts([post(['react']), post(['react', 'devops']), post(['devops'])]);
    expect([...counts.entries()]).toEqual([['react', 2], ['devops', 2]]);
  });
  it('omits tags with no posts', () => {
    const counts = tagCounts([post(['react'])]);
    expect(counts.has('devops' as never)).toBe(false);
  });
});
