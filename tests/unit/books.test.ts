import { describe, it, expect } from 'vitest';
import { parseBooks, finishedMonth, groupFinishedByYear } from '../../src/lib/books';

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

describe('finishedMonth', () => {
  it('renders the month as a three-letter caption', () => {
    expect(finishedMonth('2026-03')).toBe('MAR');
    expect(finishedMonth('2025-12')).toBe('DEC');
  });
});

describe('groupFinishedByYear', () => {
  const book = (finished: string, title = 'X') =>
    ({ id: title, title, author: 'Y', status: 'finished' as const, finished });

  it('groups newest year first, newest book first inside each year', () => {
    const groups = groupFinishedByYear([book('2025-02', 'a'), book('2026-01', 'b'), book('2025-11', 'c')]);
    expect(groups.map((g) => g.year)).toEqual([2026, 2025]);
    expect(groups[1].books.map((b) => b.title)).toEqual(['c', 'a']);
  });

  it('skips books with no finished date rather than crashing', () => {
    const groups = groupFinishedByYear([{ id: 'x', title: 'X', author: 'Y', status: 'finished' }]);
    expect(groups).toEqual([]);
  });

  it('returns an empty list for an empty input', () => {
    expect(groupFinishedByYear([])).toEqual([]);
  });
});
