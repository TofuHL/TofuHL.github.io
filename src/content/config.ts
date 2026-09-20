import { defineCollection, z } from 'astro:content';

const team = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    role: z.record(z.string()),
    bio: z.record(z.string()),
    location: z.string(),
    photoAlt: z.record(z.string()),
    order: z.number(),
    group: z.enum(['founders', 'sweden', 'ukraine', 'board']),
  }),
});

const partners = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    description: z.record(z.string()),
    url: z.string().optional(),
    kind: z.enum(['implementation', 'corporate', 'media', 'institutional']),
  }),
});

const press = defineCollection({
  type: 'data',
  schema: z.object({
    outlet: z.string(),
    headline: z.record(z.string()),
    date: z.string(),
    url: z.string(),
  }),
});

const testimonials = defineCollection({
  type: 'data',
  schema: z.object({
    quote: z.record(z.string()),
    name: z.string(),
    role: z.record(z.string()),
    kind: z.enum(['donor', 'partner', 'family']),
  }),
});

const stories = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.date(),
    author: z.string(),
    location: z.string(),
    programme: z.enum(['education', 'shelter', 'psychosocial', 'nutrition']),
    photoAlt: z.string(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { team, partners, press, testimonials, stories };
