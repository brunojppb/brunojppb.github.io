/**
 * The ⌘K palette's index shape and its matching rules. Pure: the island
 * (src/components/islands/CommandPalette.tsx) fetches /search-index.json,
 * emitted by src/pages/search-index.json.ts, and passes it through here.
 *
 * Post bodies are deliberately absent. Titles, descriptions and tags are
 * what a reader searches a blog by, and leaving bodies out keeps the whole
 * index under 10 kB.
 */

export interface PostEntry {
  kind: 'post';
  title: string;
  description: string;
  url: string;
  /** YYYY-MM-DD, the form the listing rows show. */
  date: string;
  tags: string[];
}

export interface TagEntry {
  kind: 'tag';
  label: string;
  url: string;
  count: number;
}

export interface PageEntry {
  kind: 'page';
  /** The tab-bar name, e.g. `src/`. */
  label: string;
  title: string;
  description: string;
  url: string;
}

export type Entry = PostEntry | TagEntry | PageEntry;

export type MatchedIn = 'title' | 'tag' | 'description';

export interface Result {
  entry: Entry;
  matchedIn: MatchedIn;
  /** The query as the reader typed it, for the highlight and the provenance line. */
  term: string;
}

export type Filter = 'all' | 'posts' | 'tags' | 'pages';

export interface Group {
  label: 'POSTS' | 'TAGS' | 'PAGES';
  /** Every match, including the ones the cap hides. */
  total: number;
  results: Result[];
}

const GROUPS = [
  { kind: 'post', label: 'POSTS', filter: 'posts', cap: 5 },
  { kind: 'tag', label: 'TAGS', filter: 'tags', cap: 3 },
  { kind: 'page', label: 'PAGES', filter: 'pages', cap: 3 },
] as const;

const RANK: Record<MatchedIn, number> = { title: 0, tag: 1, description: 2 };

const RECENT_COUNT = 3;
const TOP_TAG_COUNT = 3;

function matchEntry(entry: Entry, q: string): MatchedIn | null {
  const has = (s: string) => s.toLowerCase().includes(q);
  switch (entry.kind) {
    case 'post':
      if (has(entry.title)) return 'title';
      if (entry.tags.some(has)) return 'tag';
      if (has(entry.description)) return 'description';
      return null;
    case 'tag':
      return has(entry.label) ? 'title' : null;
    case 'page':
      if (has(entry.label) || has(entry.title)) return 'title';
      if (has(entry.description)) return 'description';
      return null;
  }
}

/** Compares two results of the same kind: strongest match first, then newest or most used. */
function compare(a: Result, b: Result): number {
  const byRank = RANK[a.matchedIn] - RANK[b.matchedIn];
  if (byRank !== 0) return byRank;
  if (a.entry.kind === 'post' && b.entry.kind === 'post') {
    return b.entry.date.localeCompare(a.entry.date);
  }
  if (a.entry.kind === 'tag' && b.entry.kind === 'tag') {
    return b.entry.count - a.entry.count;
  }
  return 0;
}

/**
 * Matches a query against the index and returns the groups the palette draws.
 * An empty query returns no groups: that is the palette's empty state, not a miss.
 */
export function search(index: Entry[], query: string, filter: Filter = 'all'): Group[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return GROUPS.filter((g) => filter === 'all' || filter === g.filter)
    .map(({ kind, label, cap }) => {
      const results = index
        .filter((entry) => entry.kind === kind)
        .flatMap((entry) => {
          const matchedIn = matchEntry(entry, q);
          return matchedIn ? [{ entry, matchedIn, term: query.trim() }] : [];
        })
        .sort(compare);
      return { label, total: results.length, results: results.slice(0, cap) };
    })
    .filter((g) => g.total > 0);
}

/** Splits text into runs, marking the ones that match the term, for the accent highlight. */
export function highlightParts(text: string, term: string): { text: string; hit: boolean }[] {
  const q = term.trim().toLowerCase();
  if (!q) return [{ text, hit: false }];

  const parts: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (;;) {
    const hit = text.toLowerCase().indexOf(q, at);
    if (hit === -1) break;
    if (hit > at) parts.push({ text: text.slice(at, hit), hit: false });
    parts.push({ text: text.slice(hit, hit + q.length), hit: true });
    at = hit + q.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at), hit: false });
  return parts.length ? parts : [{ text, hit: false }];
}

/** Renders a post URL as the markdown file it was written in. */
export function postFilename(url: string): string {
  return `${url.replace(/\/$/, '').split('/').pop()}.md`;
}

/** The newest posts, newest first. The palette's empty state offers these. */
export function recentPosts(index: Entry[], limit = RECENT_COUNT): PostEntry[] {
  return index
    .filter((e): e is PostEntry => e.kind === 'post')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** The most used tags, most used first. The no-match state offers these as the way out. */
export function topTags(index: Entry[], limit = TOP_TAG_COUNT): TagEntry[] {
  return index
    .filter((e): e is TagEntry => e.kind === 'tag')
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
