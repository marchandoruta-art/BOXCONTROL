import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, CreditCard, ExternalLink, ShieldAlert, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { organization, refresh } = useOrganization();
  const { user, signOut } = useAuth();
  const { can } = useRole();
  const navigate = useNavigate();
  const [name, setName] = useState(organization?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Delete workshop state
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!organization) return null;

  const org = organization as any;

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: name.trim() })
      .eq('id', organization.id);
    if (error) toast.error('Error al guardar el nombre');
    else { toast.success('Nombre actualizado'); await refresh(); }
    setSavingName(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('El logo debe pesar menos de 2 MB'); return; }
    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const path = `${organization.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Error al subir el logo'); setUploadingLogo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path);
    await supabase.from('organizations').update({ logo_url: publicUrl }).eq('id', organization.id);
    toast.success('Logo actualizado');
    await refresh();
    setUploadingLogo(false);
  };

  const handleStripePortal = async () => {
    setLoadingPortal(true);
    const { data, error } = await supabase.functions.invoke('stripe-portal');
    if (error || !data?.url) {
      if (data?.error === 'no_customer') toast.error('Aún no tienes una suscripción activa.');
      else toast.error('Error al abrir el portal de facturación');
      setLoadingPortal(false);
      return;
    }
    window.location.href = data.url;
  };

  const handleDeleteOrg = async () => {
    if (deleteConfirm !== organization.name) {
      toast.error('El nombre no coincide');
      return;
    }
    setDeleting(true);
    const { error } = await supabase
      .from('organizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', organization.id);
    if (error) {
      toast.error('Error al eliminar el taller: ' + error.message);
      setDeleting(false);
      return;
    }
    toast.success('Taller eliminado. Los datos se conservan 90 días.');
    await signOut();
    navigate('/');
  };

  // Subscription info
  const status = org.subscription_status ?? 'trialing';
  const trialEnd: Date | null = org.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const subEnd: Date | null = org.subscription_ends_at ? new Date(org.subscription_ends_at) : null;
  const now = new Date();

  const daysUntilTrialEnd = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)) : 0;
  const daysUntilSubEnd = subEnd ? Math.max(0, Math.ceil((subEnd.getTime() - now.getTime()) / 86400000)) : null;

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    trialing: {
      label: trialEnd && trialEnd > now
        ? `Prueba gratuita · ${daysUntilTrialEnd} días restantes`
        : 'Prueba gratuita expirada',
      color: trialEnd && trialEnd > now ? 'text-amber-500' : 'text-destructive',
      icon: <Clock className="h-4 w-4" />,
    },
    active: {
      label: subEnd ? `Activa · renueva el ${subEnd.toLocaleDateString('es-ES')}` : 'Activa',
      color: 'text-green-500',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    past_due: {
      label: 'Pago pendiente',
      color: 'text-destructive',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    canceled: {
      label: subEnd && subEnd > now
        ? `Cancelada · acceso hasta el ${subEnd.toLocaleDateString('es-ES')}`
        : 'Cancelada',
      color: 'text-muted-foreground',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  };

  const currentStatus = statusConfig[status] ?? statusConfig.trialing;

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <h1 className="text-xl font-bold">Configuración</h1>

        {/* Datos del taller */}
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del taller</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt="Logo" className="h-16 w-16 rounded-lg object-contain border bg-muted" />
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground text-xs">Sin logo</div>
              )}
              <div className="space-y-1">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}>
                  {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
                </Button>
                <p className="text-xs text-muted-foreground">PNG o JPG · máx. 2 MB</p>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-name">Nombre del taller</Label>
              <div className="flex gap-2">
                <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()} />
                <Button onClick={handleSaveName} disabled={savingName || name === organization.name}>
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Slug: <span className="font-mono">{organization.slug}</span></p>
              <p>Admin: {user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Suscripción — solo admin */}
        {can('canManageBilling') && <Card>
          <CardHeader><CardTitle className="text-base">Membresía</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Estado */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
              <div className="flex items-center gap-2">
                <span className={currentStatus.color}>{currentStatus.icon}</span>
                <div>
                  <p className={`text-sm font-medium ${currentStatus.color}`}>{currentStatus.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">Plan: {org.plan ?? 'trial'}</p>
                </div>
              </div>
            </div>

            {/* Fechas */}
            {trialEnd && status === 'trialing' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fin del período de prueba</span>
                <span>{trialEnd.toLocaleDateString('es-ES')}</span>
              </div>
            )}
            {subEnd && status === 'active' && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Próxima renovación</span>
                <span>{subEnd.toLocaleDateString('es-ES')} · {daysUntilSubEnd} días</span>
              </div>
            )}
            {subEnd && status === 'canceled' && subEnd > now && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Acceso hasta</span>
                <span>{subEnd.toLocaleDateString('es-ES')}</span>
              </div>
            )}

            {/* CTA */}
            {status === 'active' ? (
              <Button variant="outline" className="gap-2 w-full" onClick={handleStripePortal} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Gestionar suscripción · Stripe
              </Button>
            ) : status === 'past_due' ? (
              <Button variant="destructive" className="gap-2 w-full" onClick={handleStripePortal} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Actualizar método de pago
              </Button>
            ) : (
              <Button className="gap-2 w-full" onClick={handleStripePortal} disabled={loadingPortal}>
                {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Activar suscripción
              </Button>
            )}
          </CardContent>
        </Card>}

        {/* Zona de peligro — solo admin */}
        {can('canDeleteOrg') && <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Zona de peligro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!deleteMode ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Eliminar el taller borra permanentemente el acceso. Los datos se conservan 90 días antes de eliminarse definitivamente.
                </p>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/5 gap-2"
                  onClick={() => setDeleteMode(true)}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar taller
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 inline mr-1.5" />
                  Esta acción es irreversible. Todos los usuarios perderán el acceso inmediatamente.
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="delete-confirm" className="text-sm">
                    Escribe <strong>{organization.name}</strong> para confirmar
                  </Label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={organization.name}
                    className="border-destructive/40 focus-visible:ring-destructive/30"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setDeleteMode(false); setDeleteConfirm(''); }}
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 gap-2"
                    onClick={handleDeleteOrg}
                    disabled={deleting || deleteConfirm !== organization.name}
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Eliminar definitivamente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>}
      </div>
    </AppShell>
  );
}
