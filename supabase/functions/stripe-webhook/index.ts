// supabase functions deploy stripe-webhook --no-verify-jwt
// Webhook URL: https://<proyecto>.supabase.co/functions/v1/stripe-webhook
// Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature!, Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    console.error('Firma inválida:', err);
    return new Response(`Firma inválida: ${(err as Error).message}`, { status: 400 });
  }

  console.log(`Stripe event: ${event.type}`);

  switch (event.type) {

    // ── Pago inicial completado ────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organization_id;
      if (!organizationId) break;

      // Obtener subscription para saber la fecha de renovación
      let periodEnd: string | null = null;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        periodEnd = new Date(sub.current_period_end * 1000).toISOString();
      }

      await supabase.from('organizations').update({
        subscription_status: 'active',
        stripe_subscription_id: session.subscription as string,
        subscription_ends_at: periodEnd,
      }).eq('id', organizationId);

      console.log(`✓ Taller ${organizationId} activado. Renueva: ${periodEnd}`);
      break;
    }

    // ── Renovación o cambio de suscripción ────────────────────────────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const statusMap: Record<string, string> = {
        active:    'active',
        past_due:  'past_due',
        canceled:  'canceled',
        unpaid:    'past_due',
        trialing:  'trialing',
      };
      const newStatus = statusMap[sub.status] ?? 'past_due';
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

      await supabase.from('organizations').update({
        subscription_status: newStatus,
        subscription_ends_at: periodEnd,
      }).eq('stripe_subscription_id', sub.id);

      console.log(`↻ Suscripción ${sub.id} → ${newStatus}, renueva: ${periodEnd}`);
      break;
    }

    // ── Suscripción cancelada ─────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

      await supabase.from('organizations').update({
        subscription_status: 'canceled',
        subscription_ends_at: periodEnd,   // acceso hasta fin del período pagado
      }).eq('stripe_subscription_id', sub.id);

      console.log(`✗ Suscripción ${sub.id} cancelada. Acceso hasta: ${periodEnd}`);
      break;
    }

    // ── Pago fallido ──────────────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await supabase.from('organizations').update({
          subscription_status: 'past_due',
        }).eq('stripe_subscription_id', invoice.subscription as string);

        console.log(`⚠ Pago fallido para suscripción ${invoice.subscription}`);
      }
      break;
    }

    // ── Pago renovación exitoso ───────────────────────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        await supabase.from('organizations').update({
          subscription_status: 'active',
          subscription_ends_at: periodEnd,
        }).eq('stripe_subscription_id', invoice.subscription as string);

        console.log(`✓ Renovación exitosa ${invoice.subscription}. Nuevo período hasta: ${periodEnd}`);
      }
      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
