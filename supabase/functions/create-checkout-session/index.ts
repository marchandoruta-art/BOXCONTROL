// supabase functions deploy create-checkout-session
// Variables de entorno en Supabase → Edge Functions → Secrets:
//
//   STRIPE_SECRET_KEY                   sk_live_xxx
//   APP_URL                             https://tu-dominio.com
//   SUPABASE_URL                        (automática)
//   SUPABASE_SERVICE_ROLE_KEY           (automática)
//
//   STRIPE_PRICE_BASICO_MONTHLY         price_xxx   (19€/mes)
//   STRIPE_PRICE_BASICO_ANNUAL          price_xxx   (159€/año)
//   STRIPE_PRICE_PROFESIONAL_MONTHLY    price_xxx   (39€/mes)
//   STRIPE_PRICE_PROFESIONAL_ANNUAL     price_xxx   (329€/año)
//   STRIPE_PRICE_PRO_MONTHLY            price_xxx   (69€/mes)
//   STRIPE_PRICE_PRO_ANNUAL             price_xxx   (589€/año)

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

// Mapa plan → env var del Price ID
const PRICE_ENV: Record<string, Record<string, string>> = {
  basico:       { month: 'STRIPE_PRICE_BASICO_MONTHLY',       year: 'STRIPE_PRICE_BASICO_ANNUAL' },
  profesional:  { month: 'STRIPE_PRICE_PROFESIONAL_MONTHLY',  year: 'STRIPE_PRICE_PROFESIONAL_ANNUAL' },
  pro:          { month: 'STRIPE_PRICE_PRO_MONTHLY',          year: 'STRIPE_PRICE_PRO_ANNUAL' },
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Falta autenticación', { status: 401 });

    const body = await req.json().catch(() => ({}));
    const interval: 'month' | 'year' = body.interval === 'year' ? 'year' : 'month';
    const plan: string = ['basico', 'profesional', 'pro'].includes(body.plan) ? body.plan : 'profesional';

    const priceEnvKey = PRICE_ENV[plan][interval];
    const priceId = Deno.env.get(priceEnvKey);

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Precio no configurado: ${priceEnvKey}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    // Crear o reutilizar cliente de Stripe
    let customerId = org.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        email: userData.user.email,
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
      cancel_url:  `${Deno.env.get('APP_URL')}/settings?checkout=cancelled`,
      // Guardamos el plan en metadata para que el webhook lo lea
      metadata: {
        organization_id: org.id,
        plan,
        interval,
      },
      subscription_data: {
        metadata: { organization_id: org.id, plan },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
