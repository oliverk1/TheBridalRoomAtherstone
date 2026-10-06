// src/pages/api/book.ts
import type { APIRoute } from 'astro';

export const prerender = false; // Server-rendered endpoint

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, appointmentDate, appointmentTime, experience, shortlist, weddingDate } = data;

    if (!name || !email || !phone || !appointmentDate) {
      return new Response(JSON.stringify({ error: "Missing required booking fields" }), { status: 400 });
    }

    // 1. Dispatch Email Notification (Using standard fetch via Resend, Postmark, or SMTP)
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'The Bridal Room <appointments@thebridalroomatherstone.co.uk>',
          to: [email, 'thebridalroomatherstone@gmail.com'],
          subject: `Boutique Fitting Confirmation — ${name} (${appointmentDate})`,
          html: `
            <div style="font-family: serif; color: #172420; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="text-transform: uppercase; letter-spacing: 0.15em;">The Bridal Room Atherstone</h2>
              <p>Dear ${name},</p>
              <p>Thank you for booking your private styling consultation with Vicky and Samantha.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding: 6px; font-weight: bold;">Experience:</td><td>${experience}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Date & Time:</td><td>${appointmentDate} at ${appointmentTime}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Telephone:</td><td>${phone}</td></tr>
                <tr><td style="padding: 6px; font-weight: bold;">Approx Wedding Date:</td><td>${weddingDate || 'Not specified'}</td></tr>
              </table>
              <h4 style="text-transform: uppercase; margin-bottom: 5px;">Your Shortlisted Dresses:</h4>
              <pre style="font-family: sans-serif; font-size: 13px; background: #EBF1EE; padding: 12px; white-space: pre-wrap;">${shortlist || 'None specified'}</pre>
              <p style="font-size: 12px; color: #555; margin-top: 20px;">
                <strong>Parking Notice:</strong> Free 2-hour parking is located at Cattle Market Car Park (RingGo 3611082), just a 1-minute walk from 65 Station Street.
              </p>
            </div>
          `
        })
      });
    }

    // 2. Google Calendar Integration via Webhook (Make / Zapier / Google Apps Script)
    const GOOGLE_CALENDAR_WEBHOOK = import.meta.env.GOOGLE_CALENDAR_WEBHOOK_URL;
    if (GOOGLE_CALENDAR_WEBHOOK) {
      await fetch(GOOGLE_CALENDAR_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Fitting: ${name} (${experience})`,
          start: `${appointmentDate}T${appointmentTime}`,
          description: `Bride: ${name}\nPhone: ${phone}\nEmail: ${email}\nShortlist: ${shortlist}`,
          location: "65 Station Street, Atherstone CV9 1DB"
        })
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};