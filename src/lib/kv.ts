// src/lib/kv.ts

const memoryKV = new Map<string, { value: string; expiresAt: number }>();

export async function getKV() {
  try {
    // Dynamic import for Cloudflare Workers runtime in production
    // @ts-ignore
    const cf = await import('cloudflare:workers');
    if (cf?.env?.TBR_BOOKING_HOLDS) {
      return cf.env.TBR_BOOKING_HOLDS;
    }
  } catch {
    // Falls back to in-memory KV in local dev
  }

  // Local development fallback simulating Cloudflare KV with TTL & listing
  return {
    get: async (key: string): Promise<string | null> => {
      const item = memoryKV.get(key);
      if (!item) return null;
      if (Date.now() > item.expiresAt) {
        memoryKV.delete(key);
        return null;
      }
      return item.value;
    },
    put: async (key: string, value: string, options?: { expirationTtl?: number }): Promise<void> => {
      const ttl = options?.expirationTtl || 600;
      memoryKV.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    },
    delete: async (key: string): Promise<void> => {
      memoryKV.delete(key);
    },
    list: async (options?: { prefix?: string }): Promise<{ keys: Array<{ name: string }> }> => {
      const prefix = options?.prefix || '';
      const now = Date.now();
      const keys: Array<{ name: string }> = [];

      for (const [key, item] of memoryKV.entries()) {
        if (now > item.expiresAt) {
          memoryKV.delete(key);
        } else if (key.startsWith(prefix)) {
          keys.push({ name: key });
        }
      }
      return { keys };
    }
  };
}