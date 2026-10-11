// src/pages/api/contact.ts
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, enquiryType, message } = data;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const RESEND_KEY = import.meta.env.RESEND_API_KEY;
    const boutiqueEmail = import.meta.env.BOUTIQUE_NOTIFICATION_EMAIL || 'thebridalroomatherstone@gmail.com';
    const fromAddress = import.meta.env.RESEND_FROM_EMAIL || 'The Bridal Room <onboarding@resend.dev>';

    if (RESEND_KEY && !RESEND_KEY.includes('...')) {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #FAF8F5; padding: 30px; border: 1px solid #E2DBD2;">
          <h2 style="font-family: Georgia, serif; text-transform: uppercase; color: #2D4A3E; margin: 0 0 10px 0;">New Website Enquiry</h2>
          <p style="font-size: 13px; color: #626A66; margin: 0 0 20px 0;">Received via thebridalroomatherstone.co.uk/contact</p>
          
          <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border: 1px solid #ECE7E1; font-size: 13px; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="padding: 10px 14px; font-weight: 600; color: #2D4A3E; width: 35%;">Customer Name</td>
              <td style="padding: 10px 14px; color: #172420;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="padding: 10px 14px; font-weight: 600; color: #2D4A3E;">Email Address</td>
              <td style="padding: 10px 14px; color: #172420;"><a href="mailto:${email}" style="color: #2D4A3E;">${email}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #EEE8E0;">
              <td style="padding: 10px 14px; font-weight: 600; color: #2D4A3E;">Telephone Number</td>
              <td style="padding: 10px 14px; color: #172420;">${phone || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; font-weight: 600; color: #2D4A3E;">Enquiry Nature</td>
              <td style="padding: 10px 14px; color: #172420;">${enquiryType || 'General Question'}</td>
            </tr>
          </table>

          <div style="background: #FFFFFF; border: 1px solid #ECE7E1; padding: 16px; margin-bottom: 20px;">
            <strong style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #2D4A3E; margin-bottom: 8px;">Customer Message:</strong>
            <p style="font-size: 13px; line-height: 1.6; color: #38423F; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>

          <p style="font-size: 11px; color: #7D8582; margin: 0; text-align: center;">
            The Bridal Room Atherstone &bull; 65 Station Street, CV9 1DB
          </p>
        </div>
      `;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [boutiqueEmail],
          reply_to: email,
          subject: `Enquiry: ${name} (${enquiryType || 'General'})`,
          html: emailHtml
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[Contact API Resend Error]:', errText);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('[Contact API Fatal Error]:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};