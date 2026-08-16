import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TAG_ORDER } from './lib/tags';
import { parseBooks } from './lib/books';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.enum(TAG_ORDER)).min(1),
    lang: z.enum(['en', 'pt-BR']).default('en'),
    keywords: z.string().optional(),
    image: z.string().optional(),
    draft: z.boolean().default(false),
    author: z.string().default('Bruno Paulino'),
  }),
});

// Courses Bruno created and published on Udemy. Reproduced word for word
// from content/pages/courses.md. The file() loader keys each entry by its
// `id` field, so `id` is not part of the schema below.
const courses = defineCollection({
  loader: file('src/data/courses.yaml'),
  schema: z.object({
    title: z.string(),
    url: z.url(),
    tags: z.array(z.string()),
    free: z.boolean(),
    thumbnail: z.string(),
    description: z.string(),
  }),
});

// A finished book with no finished date would silently vanish from
// groupFinishedByYear while still being counted in the section header — a
// count that lies. Exported so a unit test can exercise the refinement
// directly, rather than only through a full content build.
export const bookSchema = z
  .object({
    title: z.string(),
    author: z.string(),
    status: z.enum(['reading', 'finished']),
    isbn: z.string().optional(),
    edition: z.string().optional(),
    cover_url: z.url().optional(),
    finished: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  })
  .superRefine((book, ctx) => {
    if (book.status === 'finished' && !book.finished) {
      ctx.addIssue({
        code: 'custom',
        path: ['finished'],
        message: `"${book.title}" is in the finished section but has no finished: YYYY-MM date.`,
      });
    }
  });

// Hand-maintained reading list. src/data/books.yaml holds two flat arrays,
// reading and finished; parseBooks stamps each entry's status and id.
const books = defineCollection({
  loader: file('src/data/books.yaml', {
    // parseBooks returns Book[] — a named interface, not an indexed record —
    // so it doesn't structurally match the loader's Record<string,
    // unknown>[] parser type even though every field is plain data. The cast
    // only bridges that mismatch; the schema above still validates every
    // field at runtime.
    parser: (text) => parseBooks(text) as unknown as Record<string, unknown>[],
  }),
  schema: bookSchema,
});

export const collections = { posts, courses, books };
