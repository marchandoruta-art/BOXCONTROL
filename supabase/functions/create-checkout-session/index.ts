// Supabase Edge Function — Crea una sesión de checkout de Stripe
// supabase functions deploy create-checkout-session
// Variables: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_ANNUAL,
//            APP_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// (STRIPE_PRICE_ID como fallback si no hay variantes)
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Falta autenticación', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const interval: string = body.interval === 'year' ? 'year' : 'month';
    const priceId = interval === 'year'
      ? (Deno.env.get('STRIPE_PRICE_ID_ANNUAL') ?? Deno.env.get('STRIPE_PRICE_ID')!)
      : (Deno.env.get('STRIPE_PRICE_ID_MONTHLY') ?? Deno.env.get('STRIPE_PRICE_ID')!);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return new Response('Usuario no válido', { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!profile?.organization_id) return new Response('Sin organización asociada', { status: 400 });

    const { data: org } = await supabase
      .from('organizations')
      .select('id, stripe_customer_id, name')
      .eq('id', profile.organization_id)
      .maybeSingle();

    if (!org) return new Response('Organización no encontrada', { status: 404 });

    let customerId = org.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { organization_id: org.id },
      });
      customerId = customer.id;
      await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${Deno.env.get('APP_URL')}/dashboard?checkout=success`,
      cancel_url: `${Deno.env.get('APP_URL')}/dashboard?checkout=cancelled`,
      metadata: { organization_id: org.id },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
