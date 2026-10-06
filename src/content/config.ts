// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const dresses = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    designer: z.enum([
      "Justin Alexander",
      "Sincerity Bridal",
      "Adore by Justin Alexander",
      "Phoenix Gowns",
      "Danielle Couture"
    ]),
    category: z.string(),
    price: z.string(),
    sampleSize: z.string().default("14"),
    silhouette: z.string(),
    featured: z.boolean().default(false),
    isSampleSale: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    image: z.string(),
    imageDetail: z.string().optional(),
  }),
});

export const collections = { dresses };