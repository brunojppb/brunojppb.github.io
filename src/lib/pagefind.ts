import {
  RECENT_COUNT,
  CAPS,
  composeGroups,
  matchedIn,
  parseFields,
  queryWords,
  rankByField,
  unresolvedWords,
  type Filter,
  type Group,
  type HitText,
  type PostEntry,
  type PostHits,
  type TagEntry,
} from './search';

/** Pagefind fragment, narrowed to the fields this file reads. */
export interface Fragment {
  url?: string;
  content?: string;
  meta?: Record<string, string | undefined>;
  filters?: Record<string, string[] | undefined>;
}

interface PagefindResult {
  score: number;
  matchedMetaFields?: unknown;
  data(): Promise<Fragment>;
}

/** The part of the Pagefind browser module this file calls. */
export interface PagefindModule {
  init(): Promise<void>;
  filters(): Promise<Record<string, Record<string, number> | undefined>>;
  search(
    term: string | null,
    options?: { sort?: Record<string, 'asc' | 'desc'> }
  ): Promise<{ results: PagefindResult[] }>;
}

/** Everything the palette needs before the first keystroke. */
export interface Catalog {
  /** The `N INDEXED` count and the `in N files` miss line. */
  postCount: number;
  /** The newest posts, newest first. */
  recent: PostEntry[];
  /** Every tag with its post count. */
  tags: TagEntry[];
}

export interface SearchSession {
  readonly catalog: Catalog;
  /** Resolves null when `signal` aborted. */
  posts(query: string, limit: number, signal: AbortSignal): Promise<PostHits | null>;
}

/** Thrown when the index cannot load: no bundle (dev, failed build) or a network error. */
export class SearchUnavailable extends Error {
  constructor(cause: unknown) {
    super('search index unavailable', { cause });
  }
}

const BUNDLE = '/pagefind/pagefind.js';
const NO_POSTS: PostHits = { total: 0, rows: [] };

/** Parses one fragment into a post. A missing field gets a visible fallback, so one bad page cannot blank the list. */
export function toPostEntry(fragment: Fragment): PostEntry {
  const pathname = new URL(fragment.url ?? '/', 'http://localhost').pathname;
  const slug = pathname.replace(/\/$/, '').split('/').pop() ?? '';
  return {
    kind: 'post',
    title: fragment.meta?.title || slug,
    url: pathname,
    date: fragment.filters?.date?.[0] ?? '',
    tags: fragment.filters?.tag ?? [],
  };
}

function toHitText(fragment: Fragment, post: PostEntry): HitText {
  return {
    title: post.title,
    tags: post.tags,
    summary: fragment.meta?.description ?? '',
    content: fragment.content ?? '',
  };
}

/**
 * Full-text search over posts. Loads fragments for the first `limit` ranked
 * results only; `total` is the full count. Resolves null when `signal`
 * aborted. A query word that Pagefind could only answer with a shorter
 * indexed word makes the whole query a miss.
 */
export async function searchPosts(
  pf: PagefindModule,
  query: string,
  limit: number,
  signal: AbortSignal
): Promise<PostHits | null> {
  const found = await pf.search(query);
  if (signal.aborted) return null;
  if (found.results.length === 0) return NO_POSTS;

  const ranked = rankByField(
    found.results.map((result) => ({ result, fields: parseFields(result.matchedMetaFields) }))
  );
  const loaded = await Promise.all(
    ranked.slice(0, limit).map(async ({ result, fields }) => {
      const fragment = await result.data();
      const post = toPostEntry(fragment);
      return { post, fields, text: toHitText(fragment, post) };
    })
  );
  if (signal.aborted) return null;

  const open = unresolvedWords(
    queryWords(query),
    loaded.map((l) => l.text)
  );
  if (open.length > 0) {
    // A quoted word is looked up with no shorter-word fallback.
    const exact = await Promise.all(open.map(async (w) => (await pf.search(`"${w}"`)).results.length));
    if (signal.aborted) return null;
    if (exact.some((n) => n === 0)) return NO_POSTS;
  }

  return {
    total: found.results.length,
    rows: loaded.map(({ post, fields }) => ({ post, matchedIn: matchedIn(fields) })),
  };
}

async function loadCatalog(pf: PagefindModule): Promise<Catalog> {
  const [filters, newest] = await Promise.all([pf.filters(), pf.search(null, { sort: { date: 'desc' } })]);
  const recent = await Promise.all(
    newest.results.slice(0, RECENT_COUNT).map(async (r) => toPostEntry(await r.data()))
  );
  const tags = Object.entries(filters.tag ?? {}).map(([label, count]) => ({
    kind: 'tag' as const,
    label,
    url: `/tags/${label}/`,
    count,
  }));
  return { postCount: newest.results.length, recent, tags };
}

async function load(): Promise<SearchSession> {
  const pf: PagefindModule = await import(/* @vite-ignore */ BUNDLE);
  await pf.init();
  const catalog = await loadCatalog(pf);
  return { catalog, posts: (query, limit, signal) => searchPosts(pf, query, limit, signal) };
}

let session: Promise<SearchSession> | null = null;

/**
 * Loads Pagefind and the catalog once. Hover and open share one promise. A
 * failure clears the cache, so a later open tries again.
 */
export function openSearch(): Promise<SearchSession> {
  session ??= load().catch((error) => {
    session = null;
    throw new SearchUnavailable(error);
  });
  return session;
}

/**
 * The palette's whole search call: posts from Pagefind, tags from the
 * catalog, pages from the tab list. Resolves null when `signal` aborted.
 */
export async function runSearch(
  session: SearchSession,
  query: string,
  filter: Filter,
  signal: AbortSignal
): Promise<Group[] | null> {
  const term = query.trim();
  if (term === '') return [];
  const wantPosts = filter === 'all' || filter === 'posts';
  const posts = wantPosts ? await session.posts(term, CAPS.posts, signal) : NO_POSTS;
  if (posts === null || signal.aborted) return null;
  return composeGroups({ query: term, filter, posts, tags: session.catalog.tags });
}

