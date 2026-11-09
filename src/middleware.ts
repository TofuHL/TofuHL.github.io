import { defineMiddleware } from 'astro:middleware';

// Required by `i18n.routing: 'manual'` (see astro.config.mjs). The site is
// fully static and every localised page already lives under /en/, /sv/ or
// /uk/, so requests pass straight through.
export const onRequest = defineMiddleware((_context, next) => next());
