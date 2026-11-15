import { TABS } from './nav';

/**
 * The ⌘K palette's types and matching rules. Pure: the Pagefind boundary
 * (src/lib/pagefind.ts) gathers post hits and passes them through here.
 * Pagefind indexes post bodies. Tags and pages match as substrings.
 */

export interface PostEntry {
  kind: 'post';
  title: string;
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

/** Where a post matched. `body` means no title, tag or summary field matched. */
export type MatchedIn = 'title' | 'tag' | 'description' | 'body';

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

export const CAPS = { posts: 5, tags: 3, pages: 3 } as const;
export const RECENT_COUNT = 3;
export const TOP_TAG_COUNT = 3;

/** The six tabs as palette pages. */
export const PAGES: readonly PageEntry[] = TABS.map((tab) => ({
  kind: 'page' as const,
  label: tab.label,
  title: tab.title,
  description: tab.description,
  url: tab.href,
}));

/** A metadata field that Pagefind reports a result matched in. */
export type MetaField = 'title' | 'tags' | 'description';

const FIELD_RANK: Record<MetaField, number> = { title: 0, tags: 1, description: 2 };
const BODY_RANK = 3;

/** Keeps the field names this module knows. Pagefind also reports `image`, which carries no text. */
export function parseFields(matched: unknown): MetaField[] {
  if (!Array.isArray(matched)) return [];
  return matched.filter((f): f is MetaField => f === 'title' || f === 'tags' || f === 'description');
}

function rankOf(fields: readonly MetaField[]): number {
  return Math.min(BODY_RANK, ...fields.map((f) => FIELD_RANK[f]));
}

/**
 * Orders items by their strongest matched field: title, tags, summary, body.
 * Stable, so Pagefind's relevance order holds inside one field.
 */
export function rankByField<T extends { fields: readonly MetaField[] }>(items: readonly T[]): T[] {
  return items
    .map((item, i) => ({ item, i, rank: rankOf(item.fields) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map(({ item }) => item);
}

/** The strongest field a hit matched in, as the provenance line names it. */
export function matchedIn(fields: readonly MetaField[]): MatchedIn {
  const rank = rankOf(fields);
  return rank === 0 ? 'title' : rank === 1 ? 'tag' : rank === 2 ? 'description' : 'body';
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function tokens(text: string): string[] {
  return fold(text)
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

/** The query as folded words: lower case, no diacritics, no edge punctuation or quotes. */
export function queryWords(term: string): string[] {
  return tokens(term.replace(/"/g, ' '));
}

/** What a loaded hit says about itself, for the word guard. */
export interface HitText {
  title: string;
  tags: readonly string[];
  summary: string;
  /** The full post text from the Pagefind fragment. */
  content: string;
}

/**
 * The query words that no loaded hit contains as a word prefix. Pagefind
 * answers a word it cannot extend with the longest indexed word the query
 * word starts with, so `haskell` finds every post that has `has`. The caller
 * runs an exact search for each word returned and treats a zero as a miss.
 */
export function unresolvedWords(words: readonly string[], hits: readonly HitText[]): string[] {
  const evidence = new Set(
    hits.flatMap((h) => tokens([h.title, h.tags.join(' '), h.summary, h.content].join(' ')))
  );
  const known = [...evidence];
  return words.filter((w) => !known.some((t) => t.startsWith(w)));
}

/** TAGS group: substring match on the label, most used first. */
export function matchTags(tags: readonly TagEntry[], query: string): TagEntry[] {
  const q = query.trim().toLowerCase();
  return tags.filter((t) => t.label.toLowerCase().includes(q)).sort((a, b) => b.count - a.count);
}

/** PAGES group: substring match over the six tabs, title matches before description matches. */
export function matchPages(query: string): Array<{ page: PageEntry; matchedIn: 'title' | 'description' }> {
  const q = query.trim().toLowerCase();
  const has = (s: string) => s.toLowerCase().includes(q);
  const hits = PAGES.flatMap((page): Array<{ page: PageEntry; matchedIn: 'title' | 'description' }> =>
    has(page.label) || has(page.title)
      ? [{ page, matchedIn: 'title' }]
      : has(page.description)
        ? [{ page, matchedIn: 'description' }]
        : []
  );
  return [...hits.filter((h) => h.matchedIn === 'title'), ...hits.filter((h) => h.matchedIn === 'description')];
}

/** The posts Pagefind found: the true count and the first rows, already loaded. */
export interface PostHits {
  total: number;
  rows: Array<{ post: PostEntry; matchedIn: MatchedIn }>;
}

/**
 * Assembles the groups the palette draws. An empty query returns no groups
 * (the empty state, not a miss). A filter other than `all` keeps only its
 * group. Groups with no match are dropped.
 */
export function composeGroups(input: {
  query: string;
  filter: Filter;
  posts: PostHits;
  tags: readonly TagEntry[];
}): Group[] {
  const term = input.query.trim();
  if (!term) return [];
  const want = (f: Filter) => input.filter === 'all' || input.filter === f;

  const posts: Group = {
    label: 'POSTS',
    total: input.posts.total,
    results: input.posts.rows
      .slice(0, CAPS.posts)
      .map((row) => ({ entry: row.post, matchedIn: row.matchedIn, term })),
  };
  const tags = matchTags(input.tags, term);
  const pages = matchPages(term);
  const groups: Group[] = [
    ...(want('posts') ? [posts] : []),
    ...(want('tags')
      ? [
          {
            label: 'TAGS' as const,
            total: tags.length,
            results: tags.slice(0, CAPS.tags).map((entry) => ({ entry, matchedIn: 'title' as const, term })),
          },
        ]
      : []),
    ...(want('pages')
      ? [
          {
            label: 'PAGES' as const,
            total: pages.length,
            results: pages.slice(0, CAPS.pages).map((p) => ({ entry: p.page, matchedIn: p.matchedIn, term })),
          },
        ]
      : []),
  ];
  return groups.filter((g) => g.total > 0);
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

/** The most used tags, most used first. The no-match state offers these as the way out. */
export function topTags(tags: readonly TagEntry[], limit = TOP_TAG_COUNT): TagEntry[] {
  return [...tags].sort((a, b) => b.count - a.count).slice(0, limit);
}
