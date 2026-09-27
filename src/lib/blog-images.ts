import { getImage, inferRemoteSize } from 'astro:assets';

/**
 * Blog images, copied onto this site at build time.
 *
 * Covers and pictures inside posts are uploaded in the admin and stored there
 * (older posts may still point at a pasted link). Neither is what a visitor
 * loads: during the build, Astro fetches each one and writes resized WebP
 * copies into `/_astro/`, on klinikelogopedie.com itself. That is what makes
 * them good for search and speed:
 *
 *  - They are served from this domain. The admin domain is `noindex`, and a
 *    hotlinked picture on someone else's site can vanish at any time.
 *  - Every <img> gets `srcset`, so a phone downloads a phone-sized file.
 *  - Every <img> gets its real `width` and `height`, so the page does not jump
 *    as images arrive (Cumulative Layout Shift).
 *  - The files are fingerprinted, so nginx caches them for a year.
 *
 * Which remote hosts may be fetched is set in astro.config.mjs → image.
 *
 * Failure policy: a pasted link from another site that has gone missing falls
 * back to that link, with a warning — one dead external picture should not stop
 * the blog publishing. An *uploaded* image that cannot be fetched means the
 * admin API is broken, so the build fails loudly; on the server, a failed build
 * leaves the current site live.
 */

interface Optimised {
  src: string;
  srcset?: string;
  sizes?: string;
  width?: number;
  height?: number;
}

/** Widths for pictures in the 760px article column, up to 2x. */
const ARTICLE_WIDTHS = [480, 760, 1140, 1520];
const ARTICLE_SIZES = '(min-width: 800px) 760px, 100vw';

const CARD_WIDTHS = [400, 640, 960, 1280];

const isUpload = (url: string) => {
  try {
    return new URL(url).pathname.startsWith('/api/uploads/');
  } catch {
    return false;
  }
};

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

// A cover appears on the index, on its card and on its own page. Probe and
// transform each (url, variant) once per build rather than once per page.
const cache = new Map<string, Promise<Optimised>>();

function optimise(url: string, widths: number[], sizes: string): Promise<Optimised> {
  const key = `${url}|${widths.join(',')}|${sizes}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = transform(url, widths, sizes);
    cache.set(key, pending);
  }
  return pending;
}

async function transform(url: string, widths: number[], sizes: string): Promise<Optimised> {
  try {
    const original = await inferRemoteSize(url);
    // Never upscale: a 600px photo gets a 600px file, not a blurry 1520px one.
    const fitting = widths.filter((w) => w < original.width);
    const candidates = [...fitting, Math.min(original.width, widths[widths.length - 1]!)];
    const largest = Math.max(...candidates);

    const image = await getImage({
      src: url,
      width: largest,
      height: Math.round((largest * original.height) / original.width),
      widths: [...new Set(candidates)],
      sizes,
      format: 'webp',
    });

    return {
      src: image.src,
      srcset: image.srcSet.attribute || undefined,
      sizes,
      width: Number(image.attributes.width) || undefined,
      height: Number(image.attributes.height) || undefined,
    };
  } catch (error) {
    if (isUpload(url)) {
      throw new Error(`Could not process uploaded blog image ${url}: ${message(error)}`);
    }
    console.warn(`[blog] Could not optimise ${url}; linking to it as it is. (${message(error)})`);
    return { src: url };
  }
}

/** The cover at the top of a post — the page's largest image. */
export const postCover = (url: string) => optimise(url, ARTICLE_WIDTHS, ARTICLE_SIZES);

/**
 * A cover on a blog card. The featured card is nearly half the width of the
 * page on a laptop; the others are a third.
 */
export const cardCover = (url: string, featured: boolean) =>
  optimise(
    url,
    CARD_WIDTHS,
    featured
      ? '(min-width: 760px) 46vw, 100vw'
      : '(min-width: 1100px) 33vw, (min-width: 760px) 50vw, 100vw',
  );

/**
 * The social preview (Facebook, WhatsApp). JPEG rather than WebP, which some
 * link previewers still refuse, at the 1200px width they ask for. Absolute,
 * because it is read by other sites.
 */
export async function socialImage(url: string, site: URL | undefined): Promise<string | undefined> {
  try {
    const original = await inferRemoteSize(url);
    const width = Math.min(1200, original.width);
    const image = await getImage({
      src: url,
      width,
      height: Math.round((width * original.height) / original.width),
      format: 'jpeg',
    });
    return site ? new URL(image.src, site).href : image.src;
  } catch (error) {
    if (isUpload(url)) {
      throw new Error(`Could not process uploaded blog image ${url}: ${message(error)}`);
    }
    return url;
  }
}

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const unescapeAttr = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * Every <img> in a post's rendered body, swapped for an optimised copy. The
 * body is HTML the admin generated (or Markdown rendered here), so its images
 * are plain tags — they are rewritten in place, keeping their alt text.
 */
export async function optimiseBodyImages(html: string): Promise<string> {
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)];
  if (tags.length === 0) return html;

  const replacements = await Promise.all(
    tags.map(async ([tag]) => {
      const src = tag.match(/\ssrc="([^"]*)"/i)?.[1];
      if (!src || !/^https?:\/\//i.test(unescapeAttr(src))) return tag;
      const alt = tag.match(/\salt="([^"]*)"/i)?.[1] ?? '';
      const image = await optimise(unescapeAttr(src), ARTICLE_WIDTHS, ARTICLE_SIZES);
      if (!image.srcset) return tag.replace(src, escapeAttr(image.src));
      return (
        `<img src="${escapeAttr(image.src)}" srcset="${escapeAttr(image.srcset)}"` +
        ` sizes="${image.sizes}" width="${image.width}" height="${image.height}"` +
        ` alt="${alt}" loading="lazy" decoding="async">`
      );
    }),
  );

  let out = '';
  let last = 0;
  tags.forEach((match, i) => {
    out += html.slice(last, match.index) + replacements[i];
    last = match.index! + match[0].length;
  });
  return out + html.slice(last);
}
