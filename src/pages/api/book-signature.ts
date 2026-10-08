// src/pages/api/book-signature.ts
import type { APIRoute } from 'astro';
import scheduleConfig from '../../content/settings/schedule.json';
import { insertCalendarEvent } from '../../lib/googleCalendar';
import { getKV } from '../../lib/kv';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const {
      name,
      email,
      phone,
      appointmentDate,
      appointmentTime,
      experience,
      weddingDate,
      guestCount,
      budget,
      referral,
      styles,
      notes,
      shortlist,
      accessoriesNeeded,
      hasDress
    } = data;

    // 1. Precise Duration Calculation (Prevents UTC timezone skews)
    const duration = (scheduleConfig.slotDurations as any)[experience] || 90;
    const [startH, startM] = appointmentTime.split(':').map(Number);
    const totalEndMinutes = startH * 60 + startM + duration;
    const endH = Math.floor(totalEndMinutes / 60).toString().padStart(2, '0');
    const endM = (totalEndMinutes % 60).toString().padStart(2, '0');

    const startISO = `${appointmentDate}T${appointmentTime}:00`;
    const endISO = `${appointmentDate}T${endH}:${endM}:00`;

    // 2. Format description based on appointment type
    const isAccessory = experience.includes('Accessory') || experience.includes('Veil');
    let description = '';

    if (isAccessory) {
      description = `
ACCESSORY & VEIL STYLING:
• Bride: ${name}
• Telephone: ${phone}
• Email: ${email}
• Wedding Date: ${weddingDate || 'TBD'}
• Guests Attending: ${guestCount || 'Up to 2'}

ACCESSORIES REQUESTED:
${accessoriesNeeded || 'Veils & Hairpieces'}

DRESS STATUS:
• Bringing Dress / Photos: ${hasDress || 'Not specified'}

NOTES & DRESS DETAILS:
${notes || 'None'}
      `.trim();
    } else {
      description = `
BRIDAL GOWN CONSULTATION:
• Bride: ${name}
• Telephone: ${phone}
• Email: ${email}
• Wedding Date: ${weddingDate || 'TBD'}
• Guests Attending: ${guestCount || 'Up to 3'}
• Budget: ${budget || 'Flexible'}
• Referral: ${referral || 'Online'}

STYLE PREFERENCES:
${styles || 'None specified'}

HIGH STREET SIZE & NOTES:
${notes || 'None'}

WISHLIST SHORTLIST:
${shortlist || 'None'}
      `.trim();
    }

    // 3. Google Calendar Insert
    const CAL_ID = import.meta.env.GOOGLE_CALENDAR_ID;
    const CLIENT_EMAIL = import.meta.env.GOOGLE_CLIENT_EMAIL;
    const PRIVATE_KEY = import.meta.env.GOOGLE_PRIVATE_KEY;

    if (CAL_ID && CLIENT_EMAIL && PRIVATE_KEY && !PRIVATE_KEY.includes('...')) {
      try {
        await insertCalendarEvent(CAL_ID, CLIENT_EMAIL, PRIVATE_KEY, {
          summary: `FITTING (${duration}m): ${name} - ${experience}`,
          description,
          startISO,
          endISO,
          attendeeEmail: email,
          phone
        });
      } catch (calErr) {
        console.error('[Book Signature] Calendar event creation failed:', calErr);
      }
    }

    // 4. Clear KV hold
    const kv = await getKV();
    await kv.delete(`hold:${appointmentDate}:${appointmentTime}`);

    // 5. Send Resend Confirmation Email with Luxury Branded Template
    const RESEND_KEY = import.meta.env.RESEND_API_KEY;
    if (RESEND_KEY && !RESEND_KEY.includes('...')) {
      try {
        const fromAddress = import.meta.env.RESEND_FROM_EMAIL || 'The Bridal Room <onboarding@resend.dev>';
        const boutiqueEmail = import.meta.env.BOUTIQUE_NOTIFICATION_EMAIL || 'thebridalroomatherstone@gmail.com';

        // Import the template generator
        const { generateBookingConfirmationHtml } = await import('../../lib/emailTemplates');
        const emailHtml = generateBookingConfirmationHtml({
          name,
          email,
          phone,
          appointmentDate,
          appointmentTime,
          experience,
          duration,
          weddingDate,
          guestCount,
          shortlist,
          notes,
          accessoriesNeeded,
          isVIBPaid: false
        });

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [email],
            subject: `Your Suite is Confirmed — ${name} (${appointmentDate})`,
            html: emailHtml
          })
        });

        const resText = await emailRes.text();
        if (!emailRes.ok) {
          console.error('[Resend Error Details]:', resText);
        } else {
          console.log('[Resend Success]: Branded confirmation email delivered:', resText);
        }
      } catch (emailErr) {
        console.error('[Book Signature] Resend email dispatch failed:', emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};