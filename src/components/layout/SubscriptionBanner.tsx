import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Organization } from '@/lib/types';

const PLANS = [
  { id: 'basico',      label: 'Básico',       price: '19€/mes' },
  { id: 'profesional', label: 'Profesional',   price: '39€/mes' },
  { id: 'pro',         label: 'Pro',           price: '69€/mes' },
] as const;

export function SubscriptionBanner({ organization }: { organization: Organization }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  if (organization.subscription_status === 'active') return null;

  const daysLeft = organization.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(organization.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const handleSubscribe = async (plan: string) => {
    setLoading(true);
    setShowPlans(false);
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { interval: 'month', plan },
    });
    if (error || !data?.url) {
      toast.error('No se pudo iniciar el pago. Revisa la configuración de Stripe.');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span className="text-amber-400 font-medium">
        {organization.subscription_status === 'trialing'
          ? `Prueba gratuita · ${daysLeft} día${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`
          : 'Tu suscripción no está activa'}
      </span>

      <div className="relative flex items-center gap-2">
        {/* Botón principal: suscribirse al plan Profesional */}
        <Button
          size="sm"
          onClick={() => handleSubscribe('profesional')}
          disabled={loading}
          className="gap-1.5 whitespace-nowrap h-7 text-xs"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
          Suscribirse · 39€/mes
        </Button>

        {/* Selector de plan */}
        <button
          onClick={() => setShowPlans(!showPlans)}
          disabled={loading}
          className="h-7 px-1.5 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
          title="Ver todos los planes"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {showPlans && (
          <div className="absolute right-0 top-8 z-50 bg-card border border-border/60 rounded-lg shadow-xl p-1 min-w-[180px]">
            <p className="text-[10px] text-muted-foreground px-2 py-1 uppercase tracking-wide">Elige plan</p>
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSubscribe(p.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">{p.label}</span>
                <span className="text-xs text-muted-foreground">{p.price}</span>
              </button>
            ))}
            <div className="border-t border-border/40 mt-1 pt-1">
              <button
                onClick={() => { setShowPlans(false); navigate('/'); }}
                className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-primary/5 rounded-md transition-colors"
              >
                Ver planes anuales →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
