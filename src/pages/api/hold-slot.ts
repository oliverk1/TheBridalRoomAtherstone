// src/pages/api/hold-slot.ts
import type { APIRoute } from 'astro';
import scheduleConfig from '../../content/settings/schedule.json';
import { getKV } from '../../lib/kv';

export const prerender = false;

// POST: Place a 10-minute hold blocking the full duration + buffer
export const POST: APIRoute = async ({ request }) => {
  try {
    const { date, time, tier, brideEmail } = await request.json();

    if (!date || !time) {
      return new Response(JSON.stringify({ error: 'Missing date or time' }), { status: 400 });
    }

    const durationMinutes = (scheduleConfig.slotDurations as any)[tier] || 90;
    const bufferMinutes = scheduleConfig.bufferMinutes || 15;
    const totalSlotLength = durationMinutes + bufferMinutes;

    const [h, m] = time.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);
    const startISO = new Date(year, month - 1, day, h, m).toISOString();
    const endISO = new Date(year, month - 1, day, h, m + totalSlotLength).toISOString();

    const kv = await getKV();
    const key = `hold:${date}:${time}`;

    const existing = await kv.get(key);
    if (existing) {
      return new Response(JSON.stringify({
        error: 'This slot is currently held by another bride. Please select another time.'
      }), { status: 409 });
    }

    // Save with 600 seconds (10 mins) TTL
    const holdPayload = JSON.stringify({
      tier,
      brideEmail,
      startISO,
      endISO,
      durationMinutes,
      createdAt: Date.now()
    });

    await kv.put(key, holdPayload, { expirationTtl: 600 });

    return new Response(JSON.stringify({ success: true, holdKey: key }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// DELETE: Immediately release the hold if the bride clicks "Back"
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { date, time } = await request.json();
    if (date && time) {
      const kv = await getKV();
      await kv.delete(`hold:${date}:${time}`);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};