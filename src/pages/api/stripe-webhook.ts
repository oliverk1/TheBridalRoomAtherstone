// src/pages/api/stripe-webhook.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { insertCalendarEvent } from '../../lib/googleCalendar';
import { getKV } from '../../lib/kv';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient()
  });

  const sig = request.headers.get('stripe-signature');
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata || {};

    const startISO = `${meta.appointmentDate}T${meta.appointmentTime}:00`;
    const startDate = new Date(startISO);
    const endISO = new Date(startDate.getTime() + 120 * 60000).toISOString().slice(0, 19);

    const CAL_ID = import.meta.env.GOOGLE_CALENDAR_ID;
    const CLIENT_EMAIL = import.meta.env.GOOGLE_CLIENT_EMAIL;
    const PRIVATE_KEY = import.meta.env.GOOGLE_PRIVATE_KEY;

    // Dispatch Branded Email for Paid VIB Booking
    const RESEND_KEY = import.meta.env.RESEND_API_KEY;
    if (RESEND_KEY && !RESEND_KEY.includes('...')) {
      try {
        const fromAddress = import.meta.env.RESEND_FROM_EMAIL || 'The Bridal Room <onboarding@resend.dev>';
        const { generateBookingConfirmationHtml } = await import('../../lib/emailTemplates');
        
        const emailHtml = generateBookingConfirmationHtml({
          name: meta.name,
          email: meta.email,
          phone: meta.phone,
          appointmentDate: meta.appointmentDate,
          appointmentTime: meta.appointmentTime,
          experience: 'VIB Afternoon Tea Experience',
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
            to: [meta.email],
            subject: `VIB Suite Confirmed (£50 Deposit Received) — ${meta.name}`,
            html: emailHtml
          })
        });
      } catch (err) {
        console.error('[Stripe Webhook Email Failed]:', err);
      }
    }

    if (CAL_ID && CLIENT_EMAIL && PRIVATE_KEY && !PRIVATE_KEY.includes('...')) {
      try {
        await insertCalendarEvent(CAL_ID, CLIENT_EMAIL, PRIVATE_KEY, {
          summary: `VIB FITTING (£50 PAID): ${meta.name}`,
          description: `Bride: ${meta.name}\nEmail: ${meta.email}\nPhone: ${meta.phone}\nShortlist:\n${meta.shortlist}`,
          startISO,
          endISO,
          attendeeEmail: meta.email,
          phone: meta.phone
        });
      } catch (err) {
        console.error('[Stripe Webhook] Calendar insert failed:', err);
      }
    }

    // Release KV hold key
    const kv = await getKV();
    await kv.delete(`hold:${meta.appointmentDate}:${meta.appointmentTime}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};