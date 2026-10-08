// src/pages/api/availability.ts
import type { APIRoute } from 'astro';
import scheduleConfig from '../../content/settings/schedule.json';
import { getCalendarBusyPeriods } from '../../lib/googleCalendar';
import { getKV } from '../../lib/kv';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date'); // YYYY-MM-DD
    const tier = url.searchParams.get('tier') || 'Signature Bridal Styling';

    if (!dateStr) {
      return new Response(JSON.stringify({ error: 'Missing date parameter' }), { status: 400 });
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    const dayName = targetDate.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
    const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayConfig = (scheduleConfig.weeklyHours as any)[dayName];

    if (!dayConfig || !dayConfig.isOpen) {
      return new Response(JSON.stringify({
        slots: [],
        dayName: formattedDay,
        isClosed: true,
        message: `The boutique is closed for appointments on ${formattedDay}s.`
      }), { status: 200 });
    }

    const durationMinutes = (scheduleConfig.slotDurations as any)[tier] || 90;
    const bufferMinutes = scheduleConfig.bufferMinutes || 15;
    const totalSlotLength = durationMinutes + bufferMinutes;

    // Detect if this day has late night closing (e.g. after 18:00)
    const [openH, openM] = dayConfig.open.split(':').map(Number);
    const [closeH, closeM] = dayConfig.close.split(':').map(Number);
    const isLateNight = closeH >= 18;

    // 1. Google Calendar FreeBusy
    let busyPeriods: Array<{ start: string; end: string }> = [];
    const CAL_ID = import.meta.env.GOOGLE_CALENDAR_ID;
    const CLIENT_EMAIL = import.meta.env.GOOGLE_CLIENT_EMAIL;
    const PRIVATE_KEY = import.meta.env.GOOGLE_PRIVATE_KEY;

    if (CAL_ID && CLIENT_EMAIL && PRIVATE_KEY && !PRIVATE_KEY.includes('...')) {
      try {
        const timeMin = `${dateStr}T00:00:00Z`;
        const timeMax = `${dateStr}T23:59:59Z`;
        busyPeriods = await getCalendarBusyPeriods(CAL_ID, CLIENT_EMAIL, PRIVATE_KEY, timeMin, timeMax);
      } catch (googleErr) {
        console.warn('[Availability] Google Calendar sync skipped:', googleErr);
      }
    }

    // 2. Fetch Active Holds from KV
    const kv = await getKV();
    const kvBusyPeriods: Array<{ start: string; end: string }> = [];
    try {
      const listRes = await kv.list({ prefix: `hold:${dateStr}:` });
      for (const k of listRes.keys) {
        const raw = await kv.get(k.name);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.startISO && parsed.endISO) {
            kvBusyPeriods.push({ start: parsed.startISO, end: parsed.endISO });
          }
        }
      }
    } catch {}

    const allBusyWindows = [...busyPeriods, ...kvBusyPeriods];

    // 3. Candidate Slots from Schedule
    const startMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;

    const candidateSlots: string[] = [];
    for (let current = startMinutes; current + durationMinutes <= endMinutes; current += 30) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      candidateSlots.push(`${h}:${m}`);
    }

    // 4. Past time filter (UK Europe/London time)
    const nowInUK = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const todayStrInUK = nowInUK.toISOString().split('T')[0];
    const isToday = dateStr === todayStrInUK;
    const leadTimeCutoff = new Date(nowInUK.getTime() + 60 * 60000); // 1-hour lead time

    const availableSlots: string[] = [];

    for (const time of candidateSlots) {
      const [h, m] = time.split(':').map(Number);
      const slotStart = new Date(year, month - 1, day, h, m);
      const slotEnd = new Date(slotStart.getTime() + totalSlotLength * 60000);

      if (isToday && slotStart < leadTimeCutoff) {
        continue;
      }

      const hasConflict = allBusyWindows.some(busy => {
        const bStart = new Date(busy.start);
        const bEnd = new Date(busy.end);
        return slotStart < bEnd && slotEnd > bStart;
      });

      if (hasConflict) continue;

      availableSlots.push(time);
    }

    return new Response(JSON.stringify({
      slots: availableSlots,
      dayName: formattedDay,
      hours: `${dayConfig.open} – ${dayConfig.close}`,
      isLateNight,
      isClosed: false
    }), { status: 200 });

  } catch (err: any) {
    console.error('[API Availability Fatal Error]:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};