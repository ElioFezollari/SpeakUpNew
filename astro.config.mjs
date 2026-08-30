// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Speak Up — static bilingual site.
 *
 * Albanian is the default locale and is served from the root (`/`), English
 * lives under `/en/`. Because `prefixDefaultLocale` is false the language
 * switch in the header is a plain <a> to the mirrored URL — no client JS.
 */
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://speakup.al',
  output: 'static',
  trailingSlash: 'always',

  i18n: {
    defaultLocale: 'sq',
    locales: ['sq', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'sq',
        locales: { sq: 'sq-AL', en: 'en' },
      },
    }),
  ],
});
