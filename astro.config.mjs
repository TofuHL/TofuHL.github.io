import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Samma färger — production site is served from the apex of TofuHL.github.io
const SITE = 'https://tofuhl.github.io';

export default defineConfig({
  site: SITE,
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'sv', 'uk'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en-US',
          sv: 'sv-SE',
          uk: 'uk-UA',
        },
      },
    }),
  ],
  build: {
    format: 'directory',
  },
});
