import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import type { Organization } from '@/lib/types';

export function SubscriptionBanner({ organization }: { organization: Organization }) {
  const [loading, setLoading] = useState(false);

  if (organization.subscription_status === 'active') return null;

  const daysLeft = organization.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(organization.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSubscribe = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { interval: 'month' },
    });
    if (error || !data?.url) {
      toast.error('No se pudo iniciar el pago. Revisa la configuración de Stripe.');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div className="bg-status-quality/10 border-b border-status-quality/20 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span>
        {organization.subscription_status === 'trialing'
          ? `Prueba gratuita: te quedan ${daysLeft} día(s).`
          : 'Tu suscripción no está activa.'}
      </span>
      <Button size="sm" onClick={handleSubscribe} disabled={loading} className="gap-1.5 whitespace-nowrap">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        Suscribirse
      </Button>
    </div>
  );
}
