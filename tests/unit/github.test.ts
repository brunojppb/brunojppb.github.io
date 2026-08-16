import { describe, it, expect, vi, afterEach } from 'vitest';
import { getRepoStats } from '../../src/lib/github';

const LOCK = {
  'brunojppb/sanitisium': { stars: 42, language: 'Rust', license: 'MIT', description: 'old' },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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
    const { stats, stale } = await getRepoStats(['brunojppb/unknown'], LOCK);
    expect(stats['brunojppb/unknown'].stars).toBe(0);
    expect(stale).toEqual(['brunojppb/unknown']);
  });

  // A blackholed host drops packets without ever sending a response or a
  // reset, so a bare `fetch` would hang forever — this stub reproduces that
  // exactly: it never resolves on its own, and only rejects if its request's
  // AbortSignal fires, the same contract the real fetch/AbortController pair
  // has. Fake timers let the getRepoStats-internal timeout fire without the
  // test actually waiting on a clock, so this stays fast and deterministic.
  it('falls back once the request times out, for a request that never settles on its own', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, opts?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            const err = new Error('This operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      })
    );

    const pending = getRepoStats(['brunojppb/sanitisium'], LOCK);
    // Advance well past the internal timeout; nothing else is scheduled, so
    // this only proves something if the implementation itself sets a timer.
    await vi.advanceTimersByTimeAsync(10_000);
    const { stats, stale } = await pending;

    expect(stats['brunojppb/sanitisium'].stars).toBe(42);
    expect(stale).toEqual(['brunojppb/sanitisium']);
  });
});
