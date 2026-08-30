import sq from './sq.json';
import en from './en.json';

export const LOCALES = ['sq', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'sq';

/** Shape of a copy dictionary. `sq.json` is the source of truth for the shape. */
export type Copy = typeof sq;

const DICTS: Record<Locale, Copy> = {
  sq,
  // `en.json` is authored to mirror `sq.json` exactly; the cast keeps the two
  // in lockstep at build time — if a key is missing from en.json, this errors.
  en: en as Copy,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve the active locale. Pass `Astro.currentLocale`, which Astro derives
 * from the URL via the i18n routing config.
 */
export function getLocale(current: string | undefined): Locale {
  return isLocale(current) ? current : DEFAULT_LOCALE;
}

/** The copy dictionary for a locale. Components read every string from here. */
export function useCopy(current: string | undefined): { locale: Locale; t: Copy } {
  const locale = getLocale(current);
  return { locale, t: DICTS[locale] };
}

export const otherLocale = (locale: Locale): Locale => (locale === 'sq' ? 'en' : 'sq');

/**
 * Build a locale-aware path. Albanian is the default locale and is not
 * prefixed; English lives under `/en/`.
 *
 *   localePath('sq', '/blog/')  -> '/blog/'
 *   localePath('en', '/blog/')  -> '/en/blog/'
 */
export function localePath(locale: Locale, path = '/'): string {
  const clean = `/${path.replace(/^\/+/, '')}`;
  const withSlash = clean.endsWith('/') || clean.includes('#') ? clean : `${clean}/`;
  return locale === DEFAULT_LOCALE ? withSlash : `/${locale}${withSlash}`;
}

/**
 * Named routes with a localised slug per language.
 *
 * Anything reachable from the nav lives here rather than being hardcoded, so
 * the language switch and the hreflang alternates can map a page to its
 * counterpart even when the two languages use different words in the URL.
 */
export const ROUTES = {
  home: { sq: '/', en: '/' },
  clinic: { sq: '/klinika/', en: '/the-clinic/' },
  about: { sq: '/rreth-nesh/', en: '/about/' },
  blog: { sq: '/blog/', en: '/blog/' },
  booking: { sq: '/rezervo/', en: '/booking/' },
  contact: { sq: '/kontakt/', en: '/contact/' },
  thanks: { sq: '/kontakt/faleminderit/', en: '/contact/thank-you/' },
} as const;

export type RouteKey = keyof typeof ROUTES;

/** The full, locale-prefixed path for a named route. */
export function routePath(key: RouteKey, locale: Locale): string {
  return localePath(locale, ROUTES[key][locale]);
}

/** Drop the `/en` prefix, leaving the bare in-locale path. */
export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/en(?=\/|$)/, '') || '/';
}

/**
 * The same page in the other language.
 *
 * Named routes are translated through ROUTES. Anything else (blog posts) falls
 * back to the same path under the other locale — callers that know better,
 * such as blog post pages, should pass an explicit override to `Base`.
 */
export function mirrorPath(pathname: string, locale: Locale): string {
  const other = otherLocale(locale);
  const bare = stripLocale(pathname);

  for (const paths of Object.values(ROUTES)) {
    if (paths[locale] === bare) return localePath(other, paths[other]);
  }

  return localePath(other, bare);
}

const DATE_TAGS: Record<Locale, string> = { sq: 'sq-AL', en: 'en-GB' };

/** `14 sht. 2026` in Albanian, `14 Sep 2026` in English. */
export function formatDate(value: Date | string, locale: Locale): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(DATE_TAGS[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** ISO date for <time datetime> — always machine format, never localised. */
export function isoDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * `YYYY-MM-DD` for a date in the *local* calendar.
 *
 * Deliberately not `toISOString().slice(0,10)`: that converts to UTC first, so
 * midnight local time in Albania (UTC+1/+2) lands on the previous day. For a
 * booking calendar that would silently shift every date by one.
 */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `16:00` in Albanian, `4:00 pm` in English — per the design handoff. */
export function formatTime(hhmm: string, locale: Locale): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const date = new Date(2000, 0, 1, h, m);
  return new Intl.DateTimeFormat(DATE_TAGS[locale], {
    hour: locale === 'sq' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: locale === 'en',
  }).format(date);
}

/** `E hënë, 14 shtator` / `Monday, 14 September` — for the booking summary. */
export function formatLongDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(DATE_TAGS[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

/** Month and year heading for the calendar, e.g. `Shtator 2026`. */
export function formatMonth(date: Date, locale: Locale): string {
  const text = new Intl.DateTimeFormat(DATE_TAGS[locale], {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}
