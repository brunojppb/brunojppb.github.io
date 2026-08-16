import { describe, it, expect } from 'vitest';
import { formatSize, formatListDate, formatProseDate, groupByYear } from '../../src/lib/posts';

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
