// src/pages/api/verify-checkout.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { insertCalendarEvent } from '../../lib/googleCalendar';
import { getKV } from '../../lib/kv';
import { generateBookingConfirmationHtml } from '../../lib/emailTemplates';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400 });
    }

    const apiKey = import.meta.env.STRIPE_SECRET_KEY;
    const stripe = new Stripe(apiKey, {
      httpClient: Stripe.createFetchHttpClient()
    });

    // 1. Retrieve the session directly from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ paid: false, message: 'Payment not completed' }), { status: 200 });
    }

    const meta = session.metadata || {};

    // 2. Prevent Duplicate Calendar Entries (Idempotency check in KV)
    const kv = await getKV();
    const processedKey = `processed_stripe:${sessionId}`;
    const alreadyProcessed = await kv.get(processedKey);

    if (alreadyProcessed) {
      return new Response(JSON.stringify({ success: true, alreadyLogged: true }), { status: 200 });
    }

    // 3. Precise 2-Hour Duration Calculation (No UTC skews)
    const [startH, startM] = (meta.appointmentTime || '10:00').split(':').map(Number);
    const totalEndMinutes = startH * 60 + startM + 120; // 2 hours
    const endH = Math.floor(totalEndMinutes / 60).toString().padStart(2, '0');
    const endM = (totalEndMinutes % 60).toString().padStart(2, '0');

    const startISO = `${meta.appointmentDate}T${meta.appointmentTime}:00`;
    const endISO = `${meta.appointmentDate}T${endH}:${endM}:00`;

    const description = `
VIB AFTERNOON TEA FITTING (£50 DEPOSIT PAID):
• Bride: ${meta.name}
• Telephone: ${meta.phone}
• Email: ${meta.email}
• Wedding Date: ${meta.weddingDate || 'TBD'}
• Guests Attending: ${meta.guestCount || '4'}
• Budget: ${meta.budget}

STYLE PREFERENCES:
${meta.styles || 'None specified'}

HIGH STREET SIZE & NOTES:
${meta.notes || 'None'}

WISHLIST SHORTLIST:
${meta.shortlist || 'None'}
    `.trim();

    // 4. Insert into Google Calendar
    const CAL_ID = import.meta.env.GOOGLE_CALENDAR_ID;
    const CLIENT_EMAIL = import.meta.env.GOOGLE_CLIENT_EMAIL;
    const PRIVATE_KEY = import.meta.env.GOOGLE_PRIVATE_KEY;

    if (CAL_ID && CLIENT_EMAIL && PRIVATE_KEY && !PRIVATE_KEY.includes('...')) {
      try {
        await insertCalendarEvent(CAL_ID, CLIENT_EMAIL, PRIVATE_KEY, {
          summary: `VIB FITTING (£50 PAID): ${meta.name}`,
          description,
          startISO,
          endISO,
          attendeeEmail: meta.email,
          phone: meta.phone
        });
        console.log(`[Stripe Verification] Google Calendar 2-hour event created for ${meta.name}`);
      } catch (calErr) {
        console.error('[Stripe Verification] Calendar insert failed:', calErr);
      }
    }

    // 5. Release temporary hold and mark session as processed
    await kv.delete(`hold:${meta.appointmentDate}:${meta.appointmentTime}`);
    await kv.put(processedKey, 'true', { expirationTtl: 86400 * 7 }); // 7-day memory

    // 6. Deliver Branded Resend Confirmation Email
    const RESEND_KEY = import.meta.env.RESEND_API_KEY;
    if (RESEND_KEY && !RESEND_KEY.includes('...')) {
      try {
        const fromAddress = import.meta.env.RESEND_FROM_EMAIL || 'The Bridal Room <onboarding@resend.dev>';
        const boutiqueEmail = import.meta.env.BOUTIQUE_NOTIFICATION_EMAIL || 'thebridalroomatherstone@gmail.com';

        const emailHtml = generateBookingConfirmationHtml({
          name: meta.name,
          email: meta.email,
          phone: meta.phone,
          appointmentDate: meta.appointmentDate,
          appointmentTime: meta.appointmentTime,
          experience: 'VIB Afternoon Tea Suite',
          duration: 120,
          weddingDate: meta.weddingDate,
          guestCount: meta.guestCount,
          shortlist: meta.shortlist,
          isVIBPaid: true
        });

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [meta.email, boutiqueEmail],
            subject: `VIB Suite Confirmed (£50 Deposit Received) — ${meta.name}`,
            html: emailHtml
          })
        });
        console.log(`[Stripe Verification] Branded email delivered to ${meta.email}`);
      } catch (emailErr) {
        console.error('[Stripe Verification] Email send error:', emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, booking: meta }), { status: 200 });
  } catch (err: any) {
    console.error('[Verify Checkout Error]:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};