import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRepoStats } from '../../src/lib/github';

const LOCK = {
  'brunojppb/sanitisium': { stars: 42, language: 'Rust', license: 'MIT', description: 'old' },
};

afterEach(() => vi.unstubAllGlobals());

describe('getRepoStats', () => {
  it('uses the API response when it succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      stargazers_count: 99, language: 'Rust',
      license: { spdx_id: 'MIT' }, description: 'fresh',
    }), { status: 200 })));

    const { stats, stale } = await getRepoStats(['brunojppb/sanitisium'], LOCK);
    expect(stats['brunojppb/sanitisium'].stars).toBe(99);
    expect(stats['brunojppb/sanitisium'].description).toBe('fresh');
    expect(stale).toEqual([]);
  });

  it('falls back to the lock file when the API rate limits', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 403 })));
    const { stats, stale } = await getRepoStats(['brunojppb/sanitisium'], LOCK);
    expect(stats['brunojppb/sanitisium'].stars).toBe(42);
    expect(stale).toEqual(['brunojppb/sanitisium']);
  });

  it('falls back when the network throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ENOTFOUND'); }));
    const { stats, stale } = await getRepoStats(['brunojppb/sanitisium'], LOCK);
    expect(stats['brunojppb/sanitisium'].stars).toBe(42);
    expect(stale).toEqual(['brunojppb/sanitisium']);
  });

  it('never throws, even with no lock entry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { stats } = await getRepoStats(['brunojppb/unknown'], LOCK);
    expect(stats['brunojppb/unknown'].stars).toBe(0);
  });
});
