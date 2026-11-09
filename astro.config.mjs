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
    // "manual": every site page already lives under /en/, /sv/ or /uk/ and the
    // root redirect is handled by src/pages/index.astro. Manual routing keeps
    // that output identical while still allowing non-localised pages such as
    // the private /planner/ app (Astro's automatic routing 404s those).
    routing: 'manual',
  },
  integrations: [
    sitemap({
      // Leave out the root redirect page and the private /planner/ app.
      filter: (page) => page !== `${SITE}/` && !page.includes('/planner/'),
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
