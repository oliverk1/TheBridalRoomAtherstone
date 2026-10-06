// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const dresses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/dresses" }),
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
    image: z.string(),
    imageDetail: z.string().optional(),
  }),
});

export const collections = { dresses };