export interface RepoStats {
  stars: number;
  language: string | null;
  license: string | null;
  description: string | null;
}

const EMPTY: RepoStats = { stars: 0, language: null, license: null, description: null };

// A blackholed host never sends a response and never resets the connection,
// so a bare `fetch` hangs on Node's own TCP timeout — a duration this code
// does not control and long enough to stall a Cloudflare build. Bounding
// every request to this ceiling keeps one bad repo from blocking the build.
const REQUEST_TIMEOUT_MS = 5000;

async function fetchOne(
  slug: string,
  fallback: RepoStats
): Promise<{ stats: RepoStats; stale: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'bpaulino.com' },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`github: ${slug} returned ${res.status}, using committed values`);
      return { stats: fallback, stale: true };
    }
    const j = await res.json();
    return {
      stats: {
        stars: j.stargazers_count ?? fallback.stars,
        language: j.language ?? fallback.language,
        license: j.license?.spdx_id ?? fallback.license,
        description: j.description ?? fallback.description,
      },
      stale: false,
    };
  } catch (err) {
    const reason = controller.signal.aborted
      ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
      : String(err);
    console.warn(`github: ${slug} failed (${reason}), using committed values`);
    return { stats: fallback, stale: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads repository stats from the GitHub API, falling back to the committed
 * values. A failed, rate-limited or hung request never fails the build.
 * `stale` lists the slugs served from the lock file rather than the API, so
 * a caller can decide whether it is safe to refresh the lock file with this
 * result. Requests run concurrently so a single hung repo costs one timeout,
 * not one timeout per repo.
 */
export async function getRepoStats(
  slugs: string[],
  lock: Record<string, RepoStats>
): Promise<{ stats: Record<string, RepoStats>; stale: string[] }> {
  const results = await Promise.all(
    slugs.map((slug) => fetchOne(slug, lock[slug] ?? EMPTY))
  );

  const stats: Record<string, RepoStats> = {};
  const stale: string[] = [];
  slugs.forEach((slug, i) => {
    stats[slug] = results[i].stats;
    if (results[i].stale) stale.push(slug);
  });

  return { stats, stale };
}
