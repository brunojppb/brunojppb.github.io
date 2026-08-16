import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TAG_ORDER } from './lib/tags';

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

export const collections = { posts, courses };
