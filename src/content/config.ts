// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const dresses = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    designer: z.string(),
    category: z.string(),
    price: z.string(),
    sampleSize: z.string().default("14"),
    silhouette: z.string().default("A-Line"),
    neckline: z.string().optional().default("Sweetheart"),
    featured: z.boolean().default(false),
    isSampleSale: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    image: z.string(),
    imageDetail: z.string().optional(),
    gallery: z.union([
      z.array(z.string()),
      z.array(z.object({ photo: z.string() }))
    ]).optional().default([]),
  }),
});

export const collections = { dresses };