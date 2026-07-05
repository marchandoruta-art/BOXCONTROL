import { useState, useRef } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, CreditCard, ExternalLink, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { organization, refresh } = useOrganization();
  const { user } = useAuth();
  const [name, setName] = useState(organization?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!organization) return null;

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim() })
      .eq('id', organization.id);
    if (error) {
      toast.error('Error al guardar el nombre');
    } else {
      toast.success('Nombre actualizado');
      await refresh();
    }
    setSavingName(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo debe pesar menos de 2 MB');
      return;
    }
    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const path = `${organization.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('org-logos')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error('Error al subir el logo: ' + uploadError.message);
      setUploadingLogo(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path);
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: publicUrl })
      .eq('id', organization.id);
    if (updateError) {
      toast.error('Logo subido pero error al guardar URL');
    } else {
      toast.success('Logo actualizado');
      await refresh();
    }
    setUploadingLogo(false);
  };

  const handleStripePortal = async () => {
    setLoadingPortal(true);
    const { data, error } = await supabase.functions.invoke('stripe-portal');
    if (error || !data?.url) {
      if (data?.error === 'no_customer') {
        toast.error('Aún no tienes una suscripción activa. Suscríbete primero.');
      } else {
        toast.error('Error al abrir el portal de facturación');
      }
      setLoadingPortal(false);
      return;
    }
    window.location.href = data.url;
  };

  const daysLeft = organization.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(organization.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const statusLabel: Record<string, string> = {
    trialing: `Prueba gratuita (${daysLeft} días restantes)`,
    active: 'Activa',
    past_due: 'Pago pendiente',
    canceled: 'Cancelada',
  };

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <h1 className="text-xl font-bold">Configuración</h1>

        {/* Datos del taller */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del taller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo */}
            <div className="flex items-center gap-4">
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt="Logo"
                  className="h-16 w-16 rounded-lg object-contain border bg-muted"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground text-xs">
                  Sin logo
                </div>
              )}
              <div className="space-y-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
                </Button>
                <p className="text-xs text-muted-foreground">PNG o JPG · máx. 2 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Nombre del taller</Label>
              <div className="flex gap-2">
                <Input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <Button onClick={handleSaveName} disabled={savingName || name === organization.name}>
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Slug: <span className="font-mono">{organization.slug}</span></p>
              <p>ID: <span className="font-mono">{organization.id}</span></p>
              <p>Admin: {user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Suscripción */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suscripción</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estado</span>
              <span
                className={
                  organization.subscription_status === 'active'
                    ? 'text-status-completed font-medium'
                    : 'text-status-pending-parts font-medium'
                }
              >
                {statusLabel[organization.subscription_status] ?? organization.subscription_status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="capitalize font-medium">{organization.plan}</span>
            </div>

            {organization.subscription_status === 'active' ? (
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={handleStripePortal}
                disabled={loadingPortal}
              >
                {loadingPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gestionar suscripción en Stripe
              </Button>
            ) : (
              <Button className="gap-2 w-full" onClick={handleStripePortal} disabled={loadingPortal}>
                {loadingPortal ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                Activar suscripción
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Zona de peligro */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Zona de peligro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Para eliminar tu taller y todos sus datos, contacta con soporte. Esta acción es
              irreversible.
            </p>
            <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/5 text-sm" disabled>
              Eliminar taller (contactar soporte)
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
