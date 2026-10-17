// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const dresses = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/dresses" }),
  schema: z.object({
    title: z.string(),
    // Allow ANY designer string so it's 100% dynamic
    designer: z.string(),
    category: z.string(),
    sampleSize: z.string().default("14"),
    silhouette: z.string().default("A-Line"),
    neckline: z.string().default("Sweetheart"),
    // Feature tags (Lace, Mikado, Pockets, etc.)
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string(),
    imageDetail: z.string().optional(),
    // Multi-angle photo gallery
    gallery: z.array(z.any()).optional().default([]),
    // Optional price so legacy markdown files won't crash
    price: z.string().optional(),
  }),
});

export const collections = { dresses };