import type { Loader, LoaderContext } from 'astro/loaders';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Content Layer loader that pulls published blog posts from the admin site's
 * JSON API at build time and turns them into a static Astro collection.
 *
 * The site is fully static: posts are fetched once, during `astro build`.
 * Publishing from the admin therefore means "trigger a rebuild" — see
 * docs/DEPLOY-DIGITALOCEAN.md for the deploy-hook wiring.
 *
 * The expected API contract is documented in docs/ADMIN-API.md.
 */

/** Raw post as it arrives from the admin API, before normalisation. */
interface RawPost {
  id?: string | number;
  slug?: string;
  locale?: string;
  lang?: string;
  language?: string;
  title?: string;
  excerpt?: string;
  description?: string;
  summary?: string;
  body?: string;
  content?: string;
  markdown?: string;
  html?: string;
  bodyFormat?: string;
  coverImage?: { url?: string; alt?: string } | string | null;
  cover?: { url?: string; alt?: string } | string | null;
  author?: { name?: string; role?: string } | string | null;
  tags?: unknown;
  status?: string;
  draft?: boolean;
  publishedAt?: string;
  published_at?: string;
  date?: string;
  updatedAt?: string;
  updated_at?: string;
  seo?: { title?: string; description?: string } | null;
  [key: string]: unknown;
}

interface PageInfo {
  page?: number;
  totalPages?: number;
  total_pages?: number;
  hasMore?: boolean;
}

interface ApiEnvelope {
  posts?: RawPost[];
  data?: RawPost[];
  items?: RawPost[];
  results?: RawPost[];
  pagination?: PageInfo;
  meta?: PageInfo;
}

const FIXTURES_PATH = new URL('../data/blog-fixtures.json', import.meta.url);

/** Read env from Vite's `import.meta.env`, falling back to raw `process.env`. */
function env(key: string): string | undefined {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const value = viteEnv?.[key] ?? process.env[key];
  return value === '' ? undefined : value;
}

const REQUEST_TIMEOUT_MS = Number(env('BLOG_API_TIMEOUT_MS') ?? 15000);
const MAX_RETRIES = 2;
const PER_PAGE = 100;
/** Guards against a paginating API that never reports the last page. */
const MAX_PAGES = 100;

function slugify(input: string): string {
  return input
    .normalize('NFD')
    // Strip combining marks so Albanian ë/ç fold to e/c in URLs.
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/** ~200 words per minute, rounded, minimum 1. */
function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function normaliseImage(value: RawPost['coverImage']): { url: string; alt: string } | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return value.trim() ? { url: value.trim(), alt: '' } : undefined;
  }
  const url = value.url?.trim();
  return url ? { url, alt: value.alt?.trim() ?? '' } : undefined;
}

function normaliseAuthor(value: RawPost['author']): { name: string; role?: string } | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    return value.trim() ? { name: value.trim() } : undefined;
  }
  const name = value.name?.trim();
  if (!name) return undefined;
  return value.role?.trim() ? { name, role: value.role.trim() } : { name };
}

/** True when a post should appear on the built site. */
function isPublishable(raw: RawPost, now: Date): boolean {
  if (raw.draft === true) return false;
  if (raw.status && !['published', 'public', 'live'].includes(raw.status.toLowerCase())) {
    return false;
  }
  const published = raw.publishedAt ?? raw.published_at ?? raw.date;
  if (published) {
    const date = new Date(published);
    // A future publish date means "scheduled": the post appears on the first
    // build that happens after that date passes.
    if (!Number.isNaN(date.getTime()) && date > now) return false;
  }
  return true;
}

/** Shape handed to `parseData`; must line up with the schema in content.config.ts. */
interface NormalisedPost {
  slug: string;
  locale: string;
  title: string;
  description: string;
  body: string;
  isHtml: boolean;
  coverImage?: { url: string; alt: string };
  author?: { name: string; role?: string };
  tags: string[];
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  seoTitle?: string;
  seoDescription?: string;
  sourceId: string;
}

function normalise(raw: RawPost, index: number): NormalisedPost | null {
  const title = raw.title?.trim();
  if (!title) return null;

  const rawBody = raw.body ?? raw.content ?? raw.markdown ?? raw.html ?? '';
  const isHtml =
    (raw.bodyFormat ?? '').toLowerCase() === 'html' ||
    (!raw.body && !raw.content && !raw.markdown && typeof raw.html === 'string');

  const localeRaw = (raw.locale ?? raw.lang ?? raw.language ?? 'sq').toLowerCase();
  const locale = localeRaw.split('-')[0] === 'en' ? 'en' : 'sq';

  const slug = (raw.slug?.trim() ? slugify(raw.slug) : slugify(title)) || `post-${index + 1}`;

  const published = raw.publishedAt ?? raw.published_at ?? raw.date;
  const publishedDate = published ? new Date(published) : new Date();
  const publishedAt = Number.isNaN(publishedDate.getTime())
    ? new Date().toISOString()
    : publishedDate.toISOString();

  const updatedRaw = raw.updatedAt ?? raw.updated_at;
  const updatedDate = updatedRaw ? new Date(updatedRaw) : undefined;
  const updatedAt =
    updatedDate && !Number.isNaN(updatedDate.getTime()) ? updatedDate.toISOString() : undefined;

  const description = (raw.excerpt ?? raw.description ?? raw.summary ?? '').trim();

  return {
    slug,
    locale,
    title,
    description,
    body: rawBody,
    isHtml,
    coverImage: normaliseImage(raw.coverImage ?? raw.cover),
    author: normaliseAuthor(raw.author),
    tags: toStringArray(raw.tags),
    publishedAt,
    updatedAt,
    readingMinutes: readingMinutes(rawBody),
    seoTitle: raw.seo?.title?.trim() || undefined,
    seoDescription: raw.seo?.description?.trim() || undefined,
    sourceId: String(raw.id ?? slug),
  };
}

function extractPosts(payload: unknown): RawPost[] {
  if (Array.isArray(payload)) return payload as RawPost[];
  const envelope = payload as ApiEnvelope;
  return envelope.posts ?? envelope.data ?? envelope.items ?? envelope.results ?? [];
}

function hasMorePages(payload: unknown, page: number, received: number): boolean {
  if (Array.isArray(payload)) return received === PER_PAGE;
  const info = (payload as ApiEnvelope).pagination ?? (payload as ApiEnvelope).meta;
  if (!info) return received === PER_PAGE;
  if (typeof info.hasMore === 'boolean') return info.hasMore;
  const totalPages = info.totalPages ?? info.total_pages;
  if (typeof totalPages === 'number') return page < totalPages;
  return received === PER_PAGE;
}

/** Marks an error as a client/contract failure that retrying cannot fix. */
class BlogApiContractError extends Error {}

async function fetchPage(
  baseUrl: string,
  token: string | undefined,
  page: number,
  logger: LoaderContext['logger'],
): Promise<unknown> {
  const url = new URL(baseUrl);
  url.searchParams.set('page', String(page));
  url.searchParams.set('perPage', String(PER_PAGE));
  if (!url.searchParams.has('status')) url.searchParams.set('status', 'published');

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        // 4xx is an auth or contract problem — retrying will not fix it.
        if (response.status >= 400 && response.status < 500) {
          throw new BlogApiContractError(
            `Blog API returned ${response.status} ${response.statusText} for ${url.pathname}. ` +
              'Check BLOG_API_URL and BLOG_API_TOKEN.',
          );
        }
        throw new Error(`Blog API returned ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (error instanceof BlogApiContractError || attempt === MAX_RETRIES) break;
      const message = error instanceof Error ? error.message : String(error);
      const backoff = 500 * 2 ** attempt;
      logger.warn(`Blog API request failed (${message}). Retrying in ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function loadFixtures(logger: LoaderContext['logger']): Promise<RawPost[]> {
  try {
    const contents = await readFile(fileURLToPath(FIXTURES_PATH), 'utf8');
    return extractPosts(JSON.parse(contents));
  } catch (error) {
    logger.warn(`Could not read blog fixtures: ${(error as Error).message}`);
    return [];
  }
}

export function blogApiLoader(): Loader {
  return {
    name: 'speakup-blog-api',

    async load({ store, logger, parseData, renderMarkdown, generateDigest }: LoaderContext) {
      const apiUrl = env('BLOG_API_URL');
      const token = env('BLOG_API_TOKEN');
      const allowFixtures = env('BLOG_ALLOW_FIXTURES') === '1';
      const isDev = env('DEV') === 'true' || env('MODE') === 'development';

      let rawPosts: RawPost[] = [];

      if (apiUrl) {
        logger.info(`Fetching blog posts from ${new URL(apiUrl).origin}...`);
        try {
          for (let page = 1; page <= MAX_PAGES; page++) {
            const payload = await fetchPage(apiUrl, token, page, logger);
            const batch = extractPosts(payload);
            rawPosts.push(...batch);
            if (batch.length === 0 || !hasMorePages(payload, page, batch.length)) break;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (isDev || allowFixtures) {
            // Never block local work on the admin API being up.
            logger.warn(`Blog API unreachable (${message}). Falling back to local fixtures.`);
            rawPosts = await loadFixtures(logger);
          } else {
            // Fail the production build loudly rather than silently shipping a
            // site whose blog has quietly gone empty.
            throw new Error(
              `Blog API fetch failed during build: ${message}\n\n` +
                'To build from the bundled sample posts instead, add this line ' +
                'to a .env file in the project root:\n' +
                '    BLOG_ALLOW_FIXTURES=1\n' +
                '(.env is gitignored and never deployed.)',
            );
          }
        }
      } else if (isDev || allowFixtures) {
        logger.warn(
          'BLOG_API_URL is not set - using local fixtures from src/data/blog-fixtures.json.',
        );
        rawPosts = await loadFixtures(logger);
      } else {
        // Deliberately fatal: a production build with no posts endpoint would
        // otherwise deploy a site whose blog has silently gone empty.
        throw new Error(
          "BLOG_API_URL is not set. Point it at the admin site's posts endpoint.\n\n" +
            'To build from the bundled sample posts instead, add this line to a ' +
            '.env file in the project root:\n' +
            '    BLOG_ALLOW_FIXTURES=1\n' +
            '(.env is gitignored and never deployed. The inline form ' +
            'BLOG_ALLOW_FIXTURES=1 npm run build is bash-only and fails in PowerShell.)',
        );
      }

      const now = new Date();
      const publishable = rawPosts.filter((raw) => isPublishable(raw, now));

      store.clear();

      const seen = new Set<string>();
      let stored = 0;

      for (const [index, raw] of publishable.entries()) {
        const post = normalise(raw, index);
        if (!post) {
          logger.warn(`Skipping a post with no title (id: ${String(raw.id ?? 'unknown')}).`);
          continue;
        }

        // Entry ids are `locale/slug`, so the same slug may exist once per
        // language without colliding.
        const id = `${post.locale}/${post.slug}`;
        if (seen.has(id)) {
          logger.warn(`Duplicate post id "${id}" - keeping the first and skipping the rest.`);
          continue;
        }
        seen.add(id);

        const { body, isHtml, ...frontmatter } = post;

        let data: Record<string, unknown>;
        try {
          data = await parseData({ id, data: frontmatter as unknown as Record<string, unknown> });
        } catch (error) {
          logger.warn(
            `Post "${id}" failed schema validation and was skipped: ${(error as Error).message}`,
          );
          continue;
        }

        const rendered = isHtml ? { html: body, metadata: {} } : await renderMarkdown(body);

        store.set({
          id,
          data,
          body,
          rendered,
          digest: generateDigest({ ...frontmatter, body }),
        });
        stored++;
      }

      const skipped = rawPosts.length - stored;
      logger.info(
        `Loaded ${stored} blog post${stored === 1 ? '' : 's'}` +
          (skipped > 0 ? ` (${skipped} draft/scheduled/invalid skipped).` : '.'),
      );
    },
  };
}
