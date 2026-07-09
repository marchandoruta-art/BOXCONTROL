import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Wrench, CreditCard, Loader2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

function BlockScreen({ title, description, cta, onCta, loading, showCancel }: {
  title: string;
  description: string;
  cta: string;
  onCta: () => void;
  loading: boolean;
  showCancel?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-lg">TallerControl</span>
        </div>

        <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>

        <Button className="w-full gap-2" onClick={onCta} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {cta}
        </Button>

        {showCancel && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate('/settings')}
          >
            Ir a configuración
          </button>
        )}
      </div>
    </div>
  );
}

export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);

  if (!organization) return <>{children}</>;

  const { subscription_status, trial_ends_at, deleted_at } = organization as any;

  // Taller eliminado
  if (deleted_at) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm space-y-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Taller eliminado</h1>
          <p className="text-sm text-muted-foreground">
            Este taller ha sido eliminado. Los datos se conservan 90 días. Contacta con soporte si fue un error.
          </p>
          <Button variant="outline" onClick={() => window.location.href = 'mailto:marchandoruta@gmail.com'}>
            Contactar soporte
          </Button>
        </div>
      </div>
    );
  }

  // Trial caducado
  if (subscription_status === 'trialing') {
    const trialEnd = trial_ends_at ? new Date(trial_ends_at) : null;
    if (!trialEnd || trialEnd < new Date()) {
      const handleSubscribe = async () => {
        setLoading(true);
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { interval: 'month' },
        });
        if (error || !data?.url) {
          toast.error('No se pudo iniciar el pago');
          setLoading(false);
          return;
        }
        window.location.href = data.url;
      };

      return (
        <BlockScreen
          title="Tu período de prueba ha terminado"
          description="Activa tu suscripción para seguir usando TallerControl y acceder a todos los vehículos, órdenes de trabajo y más."
          cta="Activar suscripción"
          onCta={handleSubscribe}
          loading={loading}
          showCancel
        />
      );
    }
  }

  // Pago fallido
  if (subscription_status === 'past_due') {
    const handlePortal = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('stripe-portal');
      if (error || !data?.url) {
        toast.error('Error al abrir el portal de facturación');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    };

    return (
      <BlockScreen
        title="Pago pendiente"
        description="Hay un problema con tu método de pago. Actualiza tu tarjeta para restablecer el acceso al taller."
        cta="Actualizar método de pago"
        onCta={handlePortal}
        loading={loading}
        showCancel
      />
    );
  }

  // Cancelada
  if (subscription_status === 'canceled') {
    const handleSubscribe = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { interval: 'month' },
      });
      if (error || !data?.url) {
        toast.error('No se pudo iniciar el pago');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    };

    return (
      <BlockScreen
        title="Suscripción cancelada"
        description="Tu suscripción fue cancelada. Reactive en cualquier momento para recuperar el acceso completo."
        cta="Reactivar suscripción"
        onCta={handleSubscribe}
        loading={loading}
        showCancel
      />
    );
  }

  return <>{children}</>;
}

// Icono para uso en settings
export { Clock };
