// src/pages/api/create-vib-checkout.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const apiKey = import.meta.env.STRIPE_SECRET_KEY;

    if (!apiKey || apiKey.includes('...')) {
      console.error('[Stripe Error]: STRIPE_SECRET_KEY is missing in .env');
      return new Response(JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured in .env' }), { status: 500 });
    }

    const stripe = new Stripe(apiKey, {
      httpClient: Stripe.createFetchHttpClient()
    });

    const origin = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'VIB Afternoon Tea Bridal Experience',
              description: '2 hours private suite hire, chilled prosecco, artisan cakes, and £75 gown credit voucher.'
            },
            unit_amount: 5000 // £50.00
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      customer_email: data.email || undefined,
      metadata: {
        name: String(data.name || '').slice(0, 100),
        email: String(data.email || '').slice(0, 100),
        phone: String(data.phone || '').slice(0, 50),
        appointmentDate: String(data.appointmentDate || ''),
        appointmentTime: String(data.appointmentTime || ''),
        experience: 'VIB Afternoon Tea Experience',
        weddingDate: String(data.weddingDate || ''),
        guestCount: String(data.guestCount || '4'),
        budget: String(data.budget || ''),
        styles: String(data.styles || '').slice(0, 300),
        notes: String(data.notes || '').slice(0, 300),
        shortlist: String(data.shortlist || '').slice(0, 450)
      },
      // Appends Stripe's dynamic session ID token on return
      success_url: `${origin}/the-experience?booking=success&session_id={CHECKOUT_SESSION_ID}#book`,
      cancel_url: `${origin}/the-experience?booking=cancelled#book`
    });

    return new Response(JSON.stringify({ checkoutUrl: session.url }), { status: 200 });
  } catch (err: any) {
    console.error('[Stripe Checkout Error Details]:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};