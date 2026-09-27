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
  site: process.env.SITE_URL ?? 'https://klinikelogopedie.com',
  output: 'static',
  trailingSlash: 'always',

  // Blog images are copied onto this site at build time (src/lib/blog-images.ts).
  // Uploads come from the admin API — over loopback on the server, localhost in
  // development — and older posts may link to any https host.
  image: {
    remotePatterns: [
      { protocol: 'https' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },

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
