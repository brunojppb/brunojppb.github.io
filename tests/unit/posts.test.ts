import { describe, it, expect } from 'vitest';
import { formatSize, formatListDate, formatProseDate, groupByYear, relatedPosts } from '../../src/lib/posts';

describe('formatSize', () => {
  it('renders whole kilobytes with a k suffix', () => {
    expect(formatSize(14_336)).toBe('14k');
    expect(formatSize(6_144)).toBe('6k');
  });
  it('never renders 0k — the smallest post is 1k', () => {
    expect(formatSize(200)).toBe('1k');
    expect(formatSize(0)).toBe('1k');
  });
  it('rounds to nearest', () => {
    expect(formatSize(1_600)).toBe('2k');
  });
});

describe('date formatting', () => {
  it('uses ISO in listings', () => {
    expect(formatListDate(new Date('2026-04-19T00:00:00Z'))).toBe('2026-04-19');
  });
  it('uses uppercase month in prose meta', () => {
    expect(formatProseDate(new Date('2026-04-19T00:00:00Z'))).toBe('2026 APR 19');
    expect(formatProseDate(new Date('2015-08-03T00:00:00Z'))).toBe('2015 AUG 03');
  });
});

describe('groupByYear', () => {
  const p = (iso: string) => ({ data: { date: new Date(iso) } }) as never;
  it('groups newest year first', () => {
    const groups = groupByYear([p('2026-04-19'), p('2025-02-19'), p('2025-03-11')]);
    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[1].posts).toHaveLength(2);
  });
});

describe('relatedPosts', () => {
  const post = (id: string, iso: string, tags: string[]) =>
    ({ id, data: { date: new Date(iso), tags } }) as never;

  it('ranks by most shared tags first, then most recent', () => {
    const current = post('current', '2026-01-01', ['a', 'b', 'c']);
    const oneShared = post('one-shared-older', '2020-01-01', ['a']);
    const twoSharedOlder = post('two-shared-older', '2019-01-01', ['a', 'b']);
    const twoSharedNewer = post('two-shared-newer', '2021-01-01', ['a', 'b']);
    const all = [current, oneShared, twoSharedOlder, twoSharedNewer];

    const result = relatedPosts(current, all);

    expect((result as { id: string }[]).map((p) => p.id)).toEqual([
      'two-shared-newer',
      'two-shared-older',
      'one-shared-older',
    ]);
  });

  it('excludes the post itself even when it would otherwise match', () => {
    const current = post('current', '2026-01-01', ['a']);
    const other = post('other', '2020-01-01', ['a']);
    const result = relatedPosts(current, [current, other]);
    expect((result as { id: string }[]).map((p) => p.id)).toEqual(['other']);
  });

  it('caps at three even when more posts share a tag', () => {
    const current = post('current', '2026-01-01', ['a']);
    const others = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id, i) =>
      post(id, `2020-01-0${i + 1}`, ['a'])
    );
    const result = relatedPosts(current, [current, ...others]);
    expect(result).toHaveLength(3);
  });

  it('returns nothing for a post with no tag-mates, rather than a fallback list', () => {
    const current = post('current', '2026-01-01', ['solo']);
    const unrelated = post('unrelated', '2020-01-01', ['other']);
    const result = relatedPosts(current, [current, unrelated]);
    expect(result).toEqual([]);
  });
});
