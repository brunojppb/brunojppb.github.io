import { describe, it, expect } from 'vitest';
import { parseBooks, finishedLabel, sortFinished } from '../../src/lib/books';
import { bookSchema } from '../../src/content.config';

const YAML = `
reading:
  - title: Ender's Game
    author: Orson Scott Card
    isbn: "9780356500843"
finished:
  - title: Dare to Lead
    author: Brené Brown
    finished: 2026-03
`;

describe('parseBooks', () => {
  it('flattens both sections and stamps status', () => {
    const books = parseBooks(YAML);
    expect(books).toHaveLength(2);
    expect(books[0].status).toBe('reading');
    expect(books[1].status).toBe('finished');
  });

  it('gives every book a stable unique id', () => {
    const books = parseBooks(YAML);
    expect(new Set(books.map((b) => b.id)).size).toBe(2);
    expect(books[0].id).toBe('reading-0');
  });

  it('handles an empty section', () => {
    expect(parseBooks('reading: []\nfinished: []')).toEqual([]);
  });

  it('handles a missing section', () => {
    const books = parseBooks("reading:\n  - title: X\n    author: Y");
    expect(books).toHaveLength(1);
  });

  it('keeps the ISBN a string so a leading zero survives', () => {
    const books = parseBooks('reading:\n  - title: X\n    author: Y\n    isbn: "0123456789"');
    expect(books[0].isbn).toBe('0123456789');
  });
});

describe('finishedLabel', () => {
  it('renders the month and year as a caption', () => {
    expect(finishedLabel('2026-03')).toBe('MAR 2026');
    expect(finishedLabel('2025-12')).toBe('DEC 2025');
  });

  it('falls back to the raw value when the month is out of range', () => {
    expect(finishedLabel('2026-13')).toBe('2026-13');
  });
});

describe('sortFinished', () => {
  const book = (finished: string, title = 'X') =>
    ({ id: title, title, author: 'Y', status: 'finished' as const, finished });

  it('returns one flat list, newest first, across years', () => {
    const list = sortFinished([book('2025-02', 'a'), book('2026-01', 'b'), book('2025-11', 'c')]);
    expect(list.map((b) => b.title)).toEqual(['b', 'c', 'a']);
  });

  it('drops books with no finished date rather than crashing', () => {
    expect(sortFinished([{ id: 'x', title: 'X', author: 'Y', status: 'finished' }])).toEqual([]);
  });

  it('returns an empty list for an empty input', () => {
    expect(sortFinished([])).toEqual([]);
  });
});

describe('bookSchema', () => {
  it('rejects a finished book with no finished date, naming it by title', () => {
    const result = bookSchema.safeParse({
      title: 'Dare to Lead',
      author: 'Brené Brown',
      status: 'finished',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      '"Dare to Lead" is in the finished section but has no finished: YYYY-MM date.'
    );
  });

  it('accepts a finished book that has a finished date', () => {
    const result = bookSchema.safeParse({
      title: 'Dare to Lead',
      author: 'Brené Brown',
      status: 'finished',
      finished: '2026-03',
    });
    expect(result.success).toBe(true);
  });

  it('does not require a finished date on a book still being read', () => {
    const result = bookSchema.safeParse({
      title: "Ender's Game",
      author: 'Orson Scott Card',
      status: 'reading',
    });
    expect(result.success).toBe(true);
  });
});
