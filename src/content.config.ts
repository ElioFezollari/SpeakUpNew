import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { blogApiLoader } from './lib/blog-loader';

/**
 * Blog posts, fetched from the admin site's JSON API at build time.
 *
 * Posts are per-locale: each post declares one language and appears only in
 * that language's blog index (`/blog/` for Albanian, `/en/blog/` for English).
 * There is no requirement to translate a post.
 *
 * This schema is the contract the admin API must satisfy. A post that fails
 * validation is skipped with a warning rather than failing the whole build —
 * one bad post should not take the site down.
 */
const blog = defineCollection({
  loader: blogApiLoader(),
  schema: z.object({
    /** URL segment, unique per locale. */
    slug: z.string().min(1),
    locale: z.enum(['sq', 'en']),
    title: z.string().min(1),
    /** Shown on cards and used as the meta description fallback. */
    description: z.string().default(''),
    coverImage: z
      .object({
        url: z.url(),
        alt: z.string().default(''),
      })
      .optional(),
    author: z
      .object({
        name: z.string().min(1),
        role: z.string().optional(),
      })
      .optional(),
    tags: z.array(z.string()).default([]),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    readingMinutes: z.number().int().positive().default(1),
    /** Optional per-post SEO overrides. */
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    /** The admin's own record id, kept for traceability. */
    sourceId: z.string(),
  }),
});

export const collections = { blog };
