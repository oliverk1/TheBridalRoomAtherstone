// src/lib/googleCalendar.ts
import { getGoogleAccessToken } from './googleAuth';

interface BusyPeriod {
  start: string;
  end: string;
}

export async function getCalendarBusyPeriods(
  calendarId: string,
  clientEmail: string,
  privateKey: string,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  const token = await getGoogleAccessToken(clientEmail, privateKey);

  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      timeZone: 'Europe/London',
      items: [{ id: calendarId }]
    })
  });

  if (!response.ok) {
    throw new Error(`Google FreeBusy error: ${await response.text()}`);
  }

  const data = await response.json() as {
    calendars: Record<string, { busy: BusyPeriod[] }>;
  };
  return data.calendars[calendarId]?.busy || [];
}

export async function insertCalendarEvent(
  calendarId: string,
  clientEmail: string,
  privateKey: string,
  event: {
    summary: string;
    description: string;
    startISO: string;
    endISO: string;
    attendeeEmail: string;
    phone: string;
  }
) {
  const token = await getGoogleAccessToken(clientEmail, privateKey);

  // NOTE: 'attendees' is omitted to avoid Google Service Account 403 forbidden error.
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: event.summary,
      description: `${event.description}\n\nBride Email: ${event.attendeeEmail}\nTelephone: ${event.phone}`,
      start: { dateTime: event.startISO, timeZone: 'Europe/London' },
      end: { dateTime: event.endISO, timeZone: 'Europe/London' },
      location: '65 Station Street, Atherstone, Warwickshire CV9 1DB'
    })
  });

  if (!res.ok) {
    throw new Error(`Google Event Insert error: ${await res.text()}`);
  }

  return await res.json();
}