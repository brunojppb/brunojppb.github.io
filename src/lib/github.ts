export interface RepoStats {
  stars: number;
  language: string | null;
  license: string | null;
  description: string | null;
}

const EMPTY: RepoStats = { stars: 0, language: null, license: null, description: null };

/**
 * Reads repository stats from the GitHub API, falling back to the committed
 * values. A failed request never fails the build. `stale` lists the slugs
 * served from the lock file rather than the API, so a caller can decide
 * whether it is safe to refresh the lock file with this result.
 */
export async function getRepoStats(
  slugs: string[],
  lock: Record<string, RepoStats>
): Promise<{ stats: Record<string, RepoStats>; stale: string[] }> {
  const stats: Record<string, RepoStats> = {};
  const stale: string[] = [];

  for (const slug of slugs) {
    const fallback = lock[slug] ?? EMPTY;
    try {
      const res = await fetch(`https://api.github.com/repos/${slug}`, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'bpaulino.com' },
      });
      if (!res.ok) {
        console.warn(`github: ${slug} returned ${res.status}, using committed values`);
        stats[slug] = fallback;
        stale.push(slug);
        continue;
      }
      const j = await res.json();
      stats[slug] = {
        stars: j.stargazers_count ?? fallback.stars,
        language: j.language ?? fallback.language,
        license: j.license?.spdx_id ?? fallback.license,
        description: j.description ?? fallback.description,
      };
    } catch (err) {
      console.warn(`github: ${slug} failed (${String(err)}), using committed values`);
      stats[slug] = fallback;
      stale.push(slug);
    }
  }

  return { stats, stale };
}
