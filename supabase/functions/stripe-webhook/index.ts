// Supabase Edge Function (Deno). Despliega con:
//   supabase functions deploy stripe-webhook --no-verify-jwt
// Configura esta URL como endpoint del webhook en el Dashboard de Stripe:
//   https://<tu-proyecto>.supabase.co/functions/v1/stripe-webhook
// Variables de entorno necesarias:
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch (err) {
    return new Response(`Firma inválida: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organization_id;
      if (organizationId) {
        await supabase
          .from('organizations')
          .update({
            plan: 'starter',
            subscription_status: 'active',
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', organizationId);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'canceled';
      await supabase
        .from('organizations')
        .update({ subscription_status: status })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
