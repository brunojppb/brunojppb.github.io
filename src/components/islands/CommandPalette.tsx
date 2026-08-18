import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  highlightParts,
  postFilename,
  recentPosts,
  search,
  topTags,
  type Entry,
  type Filter,
  type PageEntry,
  type Result,
} from '../../lib/search';
import { TABS } from '../../lib/nav';

/**
 * The ⌘K palette: a search window over the dimmed page, keyboard first.
 * Mounted once in BaseLayout; opened by ⌘K, Ctrl+K, `/`, or either of the
 * server-rendered `[data-palette-open]` buttons in the chrome.
 *
 * It redraws the chrome bar, prompt line, section rules and rows rather than
 * importing Window, PromptLine, SectionRule and FileRow: those are `.astro`
 * components and cannot render inside a React island. Every value here still
 * comes from the same tokens, so the two stay in step.
 */

const INDEX_URL = '/search-index.json';
const FILTERS: Filter[] = ['all', 'posts', 'tags', 'pages'];
const OPTION_ID = 'palette-option';

// Fetched on first open and kept for the life of the page: the index is
// static, so a second fetch could only return the same bytes.
let cached: Entry[] | null = null;
let pending: Promise<Entry[]> | null = null;

function loadIndex(): Promise<Entry[]> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetch(INDEX_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json() as Promise<Entry[]>;
    })
    .then((entries) => {
      cached = entries;
      return entries;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

/** True when a keystroke belongs to whatever the reader is typing in. */
function inField(target: EventTarget | null): boolean {
  return !!closestElement(target, 'input, textarea, select, [contenteditable]');
}

/**
 * The nearest matching element, or null. Guards the instance check because
 * `focusin` and `pointerenter` also fire with `document` as the target, which
 * has no `closest`.
 */
function closestElement(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The first trigger a reader can actually see: the tab cell, or the chrome button on a phone. */
function visibleTrigger(): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>('[data-palette-open]')].find(
      (el) => el.offsetParent !== null
    ) ?? null
  );
}

/** Where Esc should send focus when the palette was opened by a shortcut. */
function restoreTarget(): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) return active;
  return visibleTrigger();
}

/** The typed term, drawn in the accent wherever it appears. */
function Highlight({ text, term }: { text: string; term: string }) {
  return (
    <>
      {highlightParts(text, term).map((part, i) =>
        part.hit ? (
          <span key={i} className="text-accent-lift">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </>
  );
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(cached);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const term = query.trim();
  const isEmptyQuery = term === '';

  const groups = useMemo(
    () => (entries ? search(entries, query, filter) : []),
    [entries, query, filter]
  );
  const matches = groups.reduce((sum, g) => sum + g.total, 0);
  const noMatch = !isEmptyQuery && entries !== null && matches === 0;

  const recent = useMemo(() => (entries ? recentPosts(entries) : []), [entries]);
  const tags = useMemo(() => (entries ? topTags(entries) : []), [entries]);
  const posts = useMemo(
    () => (entries ? entries.filter((e) => e.kind === 'post').length : 0),
    [entries]
  );

  // One flat list of destinations, in the order they are drawn. Arrow keys
  // cross group boundaries and reach the chips too, so every offer in the
  // palette is reachable without a mouse.
  const rows: Result[] = useMemo(() => {
    if (isEmptyQuery) {
      return [
        ...recent.map((entry) => ({ entry, matchedIn: 'title' as const, term: '' })),
        ...TABS.map((tab) => ({
          entry: {
            kind: 'page' as const,
            label: tab.label,
            title: tab.title,
            description: tab.description,
            url: tab.href,
          },
          matchedIn: 'title' as const,
          term: '',
        })),
      ];
    }
    if (noMatch) {
      return tags.map((entry) => ({ entry, matchedIn: 'title' as const, term }));
    }
    return groups.flatMap((g) => g.results);
  }, [isEmptyQuery, noMatch, recent, tags, groups, term]);

  const move = useCallback(
    (step: number) => {
      setSelected((i) => (rows.length === 0 ? 0 : (i + step + rows.length) % rows.length));
    },
    [rows.length]
  );

  const cycleFilter = useCallback((step: number) => {
    setFilter((f) => FILTERS[(FILTERS.indexOf(f) + step + FILTERS.length) % FILTERS.length]);
    setSelected(0);
  }, []);

  // Opening is always an explicit action: a shortcut, or a click on one of
  // the chrome triggers. The trigger is remembered so Esc can hand focus back.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);
      if (shortcut) {
        // ⌘K is the browser's own bookmark search on some platforms.
        event.preventDefault();
        if (!open) triggerRef.current = restoreTarget();
        setOpen((was) => !was);
        return;
      }
      if (!open && event.key === '/' && !inField(event.target) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        triggerRef.current = restoreTarget();
        setOpen(true);
      }
    }

    function onClick(event: MouseEvent) {
      const trigger = closestElement(event.target, '[data-palette-open]');
      if (!trigger) return;
      triggerRef.current = trigger;
      setOpen((was) => !was);
    }

    function prefetch(event: Event) {
      if (closestElement(event.target, '[data-palette-open]')) {
        loadIndex().catch(() => undefined);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    document.addEventListener('pointerenter', prefetch, true);
    document.addEventListener('focusin', prefetch);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerenter', prefetch, true);
      document.removeEventListener('focusin', prefetch);
    };
  }, [open]);

  // The chrome triggers are server-rendered, so their open state is set here.
  useEffect(() => {
    for (const trigger of document.querySelectorAll('[data-palette-open]')) {
      trigger.setAttribute('aria-expanded', String(open));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setFilter('all');
    setSelected(0);
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open || entries) return;
    loadIndex().then(setEntries, () => setFailed(true));
  }, [open, entries]);

  // Keep the selected row in view inside the results pane. The dialog is
  // fixed and the body cannot scroll, so the document never moves.
  useEffect(() => {
    resultsRef.current
      ?.querySelector(`#${OPTION_ID}-${selected}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected, rows]);

  if (!open) return null;

  function onDialogKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      case 'Tab':
        // Cycles the group filter rather than moving focus, which is also
        // what keeps focus inside the dialog.
        event.preventDefault();
        cycleFilter(event.shiftKey ? -1 : 1);
        break;
      case 'Enter': {
        const row = rows[selected];
        if (!row) break;
        event.preventDefault();
        window.location.href = row.entry.url;
        break;
      }
      case 'Backspace':
        if (query === '') {
          event.preventDefault();
          close();
        }
        break;
    }
  }

  const status = failed
    ? 'EXIT 2'
    : noMatch
      ? 'EXIT 1'
      : isEmptyQuery
        ? `${posts} INDEXED`
        : `${matches} MATCH${matches === 1 ? '' : 'ES'}`;

  const announcement = failed
    ? 'Search index unavailable'
    : isEmptyQuery
      ? ''
      : `${matches} result${matches === 1 ? '' : 's'}`;

  let index = -1;
  const nextId = () => `${OPTION_ID}-${++index}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="absolute inset-0 bg-scrim" aria-hidden="true" onClick={close}></div>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={onDialogKeyDown}
        className="relative flex h-full w-full flex-col border border-line-palette bg-surface-window sm:mt-24 sm:h-auto sm:max-h-[calc(100vh-192px)] sm:w-165"
      >
        <div className="flex items-center gap-2.25 border-b border-line-chrome bg-surface-chrome px-3 py-2.25 sm:gap-3 sm:px-3.5">
          <span className="hidden text-2xs tracking-chrome text-accent-lift sm:inline">⌘K</span>
          <span className="text-2xs tracking-chrome text-accent-lift sm:hidden">SEARCH</span>
          <span className="text-2xs tracking-chrome text-ink-muted">
            <span className="hidden sm:inline">bruno@bpaulino: ~ · search</span>
            <span className="sm:hidden">bpaulino ~</span>
          </span>
          <span className="ml-auto hidden text-2xs tracking-chrome text-ink-muted sm:inline" aria-hidden="true">
            {filter !== 'all' && `${filter.toUpperCase()} · `}
            {status}
          </span>
          <button
            type="button"
            onClick={close}
            className="ml-auto text-2xs tracking-chrome text-accent-lift sm:hidden"
          >
            CLOSE
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-line-hairline bg-surface-code px-4 py-3.5 text-lg sm:px-4.5 sm:py-4">
          <span className="text-accent">$</span>
          <span className="hidden text-ink-secondary sm:inline">grep</span>
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-results"
              aria-activedescendant={rows.length ? `${OPTION_ID}-${selected}` : undefined}
              aria-label="Search posts, tags and pages"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(0);
              }}
              // The block caret below is the design's cursor, so the
              // native one is hidden. The input itself is real, because
              // mobile keyboards and IME composition depend on it.
              className="w-full appearance-none bg-transparent font-mono text-lg text-ink caret-transparent outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            <span
              aria-hidden="true"
              // One character wide, at the end of the typed text: exact
              // rather than approximate, because the face is monospaced.
              style={{ left: `${query.length}ch` }}
              className="caret pointer-events-none absolute top-0 h-5.5 w-[1ch] animate-blink bg-accent"
            ></span>
            {isEmptyQuery && (
              <span className="pointer-events-none absolute left-[3ch] top-0.5 hidden text-sm text-ink-muted sm:inline">
                search posts, tags and pages
              </span>
            )}
          </div>
        </div>

        <div
          ref={resultsRef}
          id="palette-results"
          role="listbox"
          aria-label="Search results"
          // The scrollbar is hidden the same way the tab strip hides its own:
          // the group counts say how much is there, and the arrow keys scroll.
          className="flex-1 overflow-y-auto py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {failed && (
            <div className="px-4 py-6 sm:px-4.5">
              <p className="text-ink">grep: {INDEX_URL}: cannot open index</p>
              <p className="mt-3.5 max-w-[50ch] text-sm text-ink-muted">
                The search index did not load. Reload the page to try again, or press ESC and keep
                reading.
              </p>
            </div>
          )}

          {!failed && isEmptyQuery && (
            <>
              <Rule label="RECENT" tight />
              {recent.map((entry) => (
                <PostRow key={entry.url} result={{ entry, matchedIn: 'title', term: '' }} id={nextId()} selected={index === selected} />
              ))}
              <Rule label="JUMP TO" />
              <div role="none" className="flex flex-wrap gap-2 px-4 pb-2.5 pt-0.5 sm:px-4.5">
                {TABS.map((tab) => (
                  <Chip
                    key={tab.href}
                    href={tab.href}
                    label={tab.label}
                    id={nextId()}
                    selected={index === selected}
                  />
                ))}
              </div>
            </>
          )}

          {!failed && noMatch && (
            <div className="px-4 pb-6 pt-3 sm:px-4.5">
              <p className="text-ink">
                grep: {term}: no matches in {posts} files
              </p>
              <p className="mt-3.5 max-w-[50ch] text-sm text-ink-muted">
                Nothing on that yet. The closest tags are below, or press ESC and keep reading.
              </p>
              <div role="none" className="mt-4.5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Chip
                    key={tag.url}
                    href={tag.url}
                    label={`${tag.label} ${tag.count}`}
                    id={nextId()}
                    selected={index === selected}
                  />
                ))}
              </div>
            </div>
          )}

          {!failed &&
            !isEmptyQuery &&
            !noMatch &&
            groups.map((group, groupIndex) => (
              <div key={group.label} role="group" aria-label={group.label}>
                <Rule label={group.label} meta={pad(group.total)} tight={groupIndex === 0} />
                {group.results.map((result) => {
                  const id = nextId();
                  const isSelected = index === selected;
                  if (result.entry.kind === 'post') {
                    return <PostRow key={result.entry.url} result={result} id={id} selected={isSelected} />;
                  }
                  if (result.entry.kind === 'tag') {
                    return <TagRow key={result.entry.url} result={result} id={id} selected={isSelected} />;
                  }
                  return <PageRow key={result.entry.url} result={result} id={id} selected={isSelected} />;
                })}
              </div>
            ))}
        </div>

        <div className="hidden gap-5 border-t border-line-hairline bg-surface-tabbar px-4.5 py-2.5 text-2xs tracking-chrome text-ink-muted sm:flex">
          {noMatch ? (
            <span>
              <span className="text-accent-lift">BACKSPACE</span> EDIT
            </span>
          ) : (
            <>
              <span>
                <span className="text-accent-lift">↑↓</span> MOVE
              </span>
              <span>
                <span className="text-accent-lift">ENTER</span> OPEN
              </span>
              <span>
                <span className="text-accent-lift">TAB</span> FILTER
              </span>
            </>
          )}
          <span className="ml-auto">
            <span className="text-accent-lift">ESC</span> CLOSE
          </span>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </div>
  );
}

/** `tight` drops the top gap: the first rule in the pane sits right under the input. */
function Rule({ label, meta, tight }: { label: string; meta?: string; tight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 pb-2 sm:px-4.5 ${tight ? '' : 'pt-3.5'}`}
    >
      <span className="text-2xs tracking-section text-ink-muted">{label}</span>
      <span className="h-px flex-1 bg-line" aria-hidden="true"></span>
      {meta && <span className="text-2xs tracking-chrome text-ink-muted">{meta}</span>}
    </div>
  );
}

/**
 * The shared row frame. Selection is a wash plus a 2px left accent bar, never
 * the inverted fill the active tab uses: selection moves on every keypress and
 * a fill would strobe.
 */
function Row({
  href,
  id,
  selected,
  children,
}: {
  href: string;
  id: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      id={id}
      role="option"
      aria-selected={selected}
      data-palette-row
      className={`block min-h-11 border-l-2 px-4 py-3 sm:px-4.5 sm:py-2.75 ${
        selected ? 'border-accent bg-wash-code' : 'border-transparent'
      }`}
    >
      {children}
    </a>
  );
}

/**
 * The colour of a row's secondary text. `--color-ink-muted` measures 4.45:1
 * against the selection wash, just under the floor, so a selected row lifts
 * its date and provenance to `--color-ink-secondary` (6.07:1).
 */
function metaInk(selected: boolean): string {
  return selected ? 'text-ink-secondary' : 'text-ink-muted';
}

function PostRow({ result, id, selected }: { result: Result; id: string; selected: boolean }) {
  const post = result.entry;
  if (post.kind !== 'post') return null;
  const provenance =
    result.matchedIn === 'tag'
      ? 'tag'
      : result.matchedIn === 'description'
        ? 'summary'
        : null;
  // The empty state's RECENT rows carry no query, so there is nothing to
  // report about how they matched.
  const quiet = result.term === '';

  return (
    <Row href={post.url} id={id} selected={selected}>
      <div className="sm:flex sm:gap-3">
        <span
          className={`block text-2xs sm:whitespace-nowrap sm:pt-0.75 sm:text-xs ${metaInk(selected)}`}
        >
          {post.date}
        </span>
        <span className="mt-1.25 block sm:mt-0 sm:flex-1">
          <span className="block text-ink">
            <Highlight text={post.title} term={result.term} />
          </span>
          {!quiet && (
          <span className={`mt-0.5 block text-xs ${metaInk(selected)}`}>
            <span className="hidden sm:inline">{postFilename(post.url)}</span>
            {provenance && (
              <>
                <span className="hidden sm:inline"> · </span>
                matched{' '}
                {provenance === 'tag' ? (
                  <span className="text-accent-lift">
                    #{post.tags.find((t) => t.includes(result.term.toLowerCase())) ?? result.term}
                  </span>
                ) : (
                  <>
                    <span className="text-accent-lift">{result.term}</span> in summary
                  </>
                )}
              </>
            )}
          </span>
          )}
        </span>
        {selected && (
          <span className="hidden text-2xs tracking-chrome text-accent-lift sm:block sm:whitespace-nowrap sm:pt-1">
            ENTER
          </span>
        )}
      </div>
    </Row>
  );
}

function TagRow({ result, id, selected }: { result: Result; id: string; selected: boolean }) {
  const tag = result.entry;
  if (tag.kind !== 'tag') return null;
  return (
    <Row href={tag.url} id={id} selected={selected}>
      <div className="flex items-baseline gap-3">
        <span className="text-xs text-accent-lift">#{tag.label}</span>
        <span className={`ml-auto text-xs sm:ml-0 sm:flex-1 ${metaInk(selected)}`}>
          {tag.count} post{tag.count === 1 ? '' : 's'}
          <span className="hidden sm:inline"> tagged {tag.label}</span>
        </span>
        <span className={`hidden text-2xs tracking-chrome sm:inline ${metaInk(selected)}`}>
          {tag.url}
        </span>
      </div>
    </Row>
  );
}

function PageRow({ result, id, selected }: { result: Result; id: string; selected: boolean }) {
  const page = result.entry as PageEntry;
  return (
    <Row href={page.url} id={id} selected={selected}>
      <div className="sm:flex sm:items-baseline sm:gap-3">
        <span className="text-ink">{page.label}</span>
        <span className={`mt-1.25 block text-xs sm:mt-0 sm:flex-1 ${metaInk(selected)}`}>
          <Highlight text={page.description} term={result.term} />
        </span>
      </div>
    </Row>
  );
}

/** A chip destination: the six pages when empty, the nearest tags on a miss. */
function Chip({
  href,
  label,
  id,
  selected,
}: {
  href: string;
  label: string;
  id: string;
  selected: boolean;
}) {
  return (
    <a
      href={href}
      id={id}
      role="option"
      aria-selected={selected}
      data-palette-row
      className={`inline-flex min-h-11 items-center border px-2.75 py-1.25 text-xs sm:min-h-0 ${
        selected ? 'border-accent text-accent-lift' : 'border-line-strong text-ink-body'
      }`}
    >
      {label}
    </a>
  );
}
