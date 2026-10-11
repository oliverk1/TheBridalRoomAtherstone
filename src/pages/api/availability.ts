// src/pages/api/availability.ts
import type { APIRoute } from 'astro';
import scheduleConfig from '../../content/settings/schedule.json';
import { getCalendarBusyPeriods } from '../../lib/googleCalendar';
import { getKV } from '../../lib/kv';

export const prerender = false;

interface BlockedSlot {
  date: string;
  time: string;
  reason?: string;
}

export const GET: APIRoute = async ({ request }): Promise<Response> => {
  try {
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date');   // YYYY-MM-DD (Single Day)
    const monthStr = url.searchParams.get('month'); // YYYY-MM (Full Month Check)
    const tier = url.searchParams.get('tier') || 'Signature Bridal Styling';

    const durationMinutes = (scheduleConfig.slotDurations as any)[tier] || 90;
    const bufferMinutes = scheduleConfig.bufferMinutes || 15;
    const totalSlotLength = durationMinutes + bufferMinutes;
    const blockedDates: string[] = (scheduleConfig as any).blockedDates || [];
    const blockedSlots: BlockedSlot[] = (scheduleConfig as any).blockedSlots || [];

    const CAL_ID = import.meta.env.GOOGLE_CALENDAR_ID;
    const CLIENT_EMAIL = import.meta.env.GOOGLE_CLIENT_EMAIL;
    const PRIVATE_KEY = import.meta.env.GOOGLE_PRIVATE_KEY;

    // =========================================================================
    // MODE 1: WHOLE-MONTH SCAN (Returns all fully booked or blocked days)
    // =========================================================================
    if (monthStr && !dateStr) {
      const [y, m] = monthStr.split('-').map(Number);
      const daysInMonth = new Date(y, m, 0).getDate();
      const timeMin = `${monthStr}-01T00:00:00Z`;
      const timeMax = `${monthStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59Z`;

      let busyPeriods: Array<{ start: string; end: string }> = [];
      if (CAL_ID && CLIENT_EMAIL && PRIVATE_KEY && !PRIVATE_KEY.includes('...')) {
        try {
          busyPeriods = await getCalendarBusyPeriods(CAL_ID, CLIENT_EMAIL, PRIVATE_KEY, timeMin, timeMax);
        } catch (e) {
          console.warn('[Month Scan] Google sync skipped:', e);
        }
      }

      const nowInUK = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
      const todayStrInUK = nowInUK.toISOString().split('T')[0];
      const leadTimeCutoff = new Date(nowInUK.getTime() + 60 * 60000);

      const fullyBookedDates: string[] = [];

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const dStr = `${monthStr}-${String(dayNum).padStart(2, '0')}`;

        // 1. Manually blocked dates (e.g. Christmas)
        if (blockedDates.includes(dStr)) {
          fullyBookedDates.push(dStr);
          continue;
        }

        const targetDate = new Date(Date.UTC(y, m - 1, dayNum));
        const dayName = targetDate.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
        const dayConfig = (scheduleConfig.weeklyHours as any)[dayName];

        if (!dayConfig || !dayConfig.isOpen) {
          fullyBookedDates.push(dStr);
          continue;
        }

        // Calculate candidate slots for this day
        const [openH, openM] = dayConfig.open.split(':').map(Number);
        const [closeH, closeM] = dayConfig.close.split(':').map(Number);
        const startMinutes = openH * 60 + openM;
        const endMinutes = closeH * 60 + closeM;

        let hasAvailableSlot = false;
        const isToday = dStr === todayStrInUK;

        for (let current = startMinutes; current + durationMinutes <= endMinutes; current += 30) {
          const h = Math.floor(current / 60);
          const min = current % 60;
          const time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          const slotStart = new Date(y, m - 1, dayNum, h, min);
          const slotEnd = new Date(slotStart.getTime() + totalSlotLength * 60000);

          if (isToday && slotStart < leadTimeCutoff) continue;
          if (blockedSlots.some(b => b.date === dStr && b.time === time)) continue;

          const isBusy = busyPeriods.some(busy => {
            const bStart = new Date(busy.start);
            const bEnd = new Date(busy.end);
            return slotStart < bEnd && slotEnd > bStart;
          });

          if (!isBusy) {
            hasAvailableSlot = true;
            break; // Found at least 1 open slot! Day is available.
          }
        }

        if (!hasAvailableSlot) {
          fullyBookedDates.push(dStr);
        }
      }

      return new Response(JSON.stringify({ fullyBookedDates, blockedDates }), { status: 200 });
    }

    // =========================================================================
    // MODE 2: SINGLE-DAY SLOTS (Generates specific slots for selected day)
    // =========================================================================
    if (!dateStr) {
      return new Response(JSON.stringify({ error: 'Missing date parameter' }), { status: 400 });
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));
    const dayName = targetDate.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
    const formattedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayConfig = (scheduleConfig.weeklyHours as any)[dayName];

    if (blockedDates.includes(dateStr)) {
      return new Response(JSON.stringify({
        slots: [],
        dayName: formattedDay,
        isClosed: true,
        message: 'The boutique is closed for appointments on this date.'
      }), { status: 200 });
    }

    if (!dayConfig || !dayConfig.isOpen) {
      return new Response(JSON.stringify({
        slots: [],
        dayName: formattedDay,
        isClosed: true,
        message: `The boutique is closed for appointments on ${formattedDay}s.`
      }), { status: 200 });
    }

    const [openH, openM] = dayConfig.open.split(':').map(Number);
    const [closeH, closeM] = dayConfig.close.split(':').map(Number);
    const isLateNight = closeH >= 18;

    let busyPeriods: Array<{ start: string; end: string }> = [];
    if (CAL_ID && CLIENT_EMAIL && PRIVATE_KEY && !PRIVATE_KEY.includes('...')) {
      try {
        const timeMin = `${dateStr}T00:00:00Z`;
        const timeMax = `${dateStr}T23:59:59Z`;
        busyPeriods = await getCalendarBusyPeriods(CAL_ID, CLIENT_EMAIL, PRIVATE_KEY, timeMin, timeMax);
      } catch (googleErr) {
        console.warn('[Availability] Google Calendar sync skipped:', googleErr);
      }
    }

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

    const startMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;
    const candidateSlots: string[] = [];

    for (let current = startMinutes; current + durationMinutes <= endMinutes; current += 30) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      candidateSlots.push(`${h}:${m}`);
    }

    const nowInUK = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const todayStrInUK = nowInUK.toISOString().split('T')[0];
    const isToday = dateStr === todayStrInUK;
    const leadTimeCutoff = new Date(nowInUK.getTime() + 60 * 60000);

    const availableSlots: string[] = [];

    for (const time of candidateSlots) {
      const [h, m] = time.split(':').map(Number);
      const slotStart = new Date(year, month - 1, day, h, m);
      const slotEnd = new Date(slotStart.getTime() + totalSlotLength * 60000);

      if (isToday && slotStart < leadTimeCutoff) continue;
      if (blockedSlots.some(b => b.date === dateStr && b.time === time)) continue;

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