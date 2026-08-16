import { parse } from 'yaml';

export interface Book {
  id: string;
  title: string;
  author: string;
  status: 'reading' | 'finished';
  isbn?: string;
  edition?: string;
  cover_url?: string;
  finished?: string;
}

/**
 * Flattens the two-section books file into one list.
 * The section name becomes each book's status.
 */
export function parseBooks(text: string): Book[] {
  const doc = (parse(text) ?? {}) as Record<string, unknown[] | null>;
  const out: Book[] = [];
  for (const status of ['reading', 'finished'] as const) {
    const list = doc[status] ?? [];
    list.forEach((raw, i) => {
      out.push({ ...(raw as object), status, id: `${status}-${i}` } as Book);
    });
  }
  return out;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Renders a `finished` value (`2026-03`) as the `[x] MAR 2026` caption. The
 * list is one flat run rather than one block per year, so each caption
 * carries its own year.
 */
export function finishedLabel(finished: string): string {
  const month = MONTHS[Number(finished.slice(5, 7)) - 1];
  return month ? `${month} ${finished.slice(0, 4)}` : finished;
}

/** Finished books in one list, newest first. Books with no date are dropped. */
export function sortFinished(books: Book[]): Book[] {
  return books
    .filter((b) => b.finished)
    .sort((a, b) => b.finished!.localeCompare(a.finished!));
}

/** The key a book's cover file is saved under — matches `scripts/fetch-book-covers.mjs`. */
export function coverKey(book: Pick<Book, 'isbn' | 'title'>): string {
  return book.isbn ?? book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Every image actually present in src/assets/books/, resolved eagerly so a
// book's cover can be looked up by its key without a static import per file
// — the set of covers changes whenever someone edits books.yaml and reruns
// the fetch script.
const covers = import.meta.glob<{ default: import('astro').ImageMetadata }>(
  '/src/assets/books/*',
  { eager: true }
);

/** The optimisable image for a book's cover, or undefined if none was downloaded. */
export function coverImage(book: Pick<Book, 'isbn' | 'title'>) {
  const key = coverKey(book);
  for (const [path, mod] of Object.entries(covers)) {
    const filename = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    if (filename === key) return mod.default;
  }
  return undefined;
}
