import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  type Vehicle,
  type VehicleStatus,
  STATUS_LABELS,
  STATUS_ORDER,
  PRIORITY_LABELS,
} from '@/lib/types';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { QualityCheckDialog } from '@/components/vehicles/QualityCheckDialog';
import { WorkTimer } from '@/components/vehicles/WorkTimer';
import { PartsList } from '@/components/vehicles/PartsList';
import { VehiclePhotos } from '@/components/vehicles/VehiclePhotos';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ShieldCheck,
  Loader2,
  Link as LinkIcon,
  Copy,
  Phone,
  Mail,
  Car,
  User,
  Calendar,
  ChevronRight,
  Pencil,
  Check,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRIORITY_COLOR: Record<string, string> = {
  baja: 'text-[hsl(215_60%_62%)] bg-[hsl(215_60%_62%/0.15)] border-[hsl(215_60%_62%/0.3)]',
  normal: 'text-[hsl(215_15%_55%)] bg-[hsl(215_15%_55%/0.15)] border-[hsl(215_15%_55%/0.3)]',
  alta: 'text-[hsl(35_92%_55%)] bg-[hsl(35_92%_55%/0.15)] border-[hsl(35_92%_55%/0.3)]',
  urgente: 'text-[hsl(0_72%_60%)] bg-[hsl(0_72%_60%/0.15)] border-[hsl(0_72%_60%/0.3)]',
};

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchVehicle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .eq('id', id)
      .maybeSingle();
    const v = data as unknown as Vehicle;
    setVehicle(v);
    setNotes(v?.work_summary ?? '');
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchVehicle(); }, [fetchVehicle]);

  const updateStatus = async (newStatus: VehicleStatus) => {
    if (!vehicle) return;
    if (vehicle.status !== 'control_calidad' && newStatus === 'terminado') {
      toast.warning('Debe pasar primero por Control de Calidad');
      return;
    }
    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', vehicle.id);
    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success(`Estado → ${STATUS_LABELS[newStatus]}`);
      fetchVehicle();
    }
  };

  const saveNotes = async () => {
    if (!vehicle) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from('vehicles')
      .update({ work_summary: notes })
      .eq('id', vehicle.id);
    if (error) toast.error('Error al guardar notas');
    else { toast.success('Notas guardadas'); setEditingNotes(false); fetchVehicle(); }
    setSavingNotes(false);
  };

  const generatePortalLink = async () => {
    if (!vehicle) return;
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .insert({ vehicle_id: vehicle.id, organization_id: vehicle.organization_id })
      .select()
      .single();
    if (error || !data) { toast.error('No se pudo generar el enlace'); return; }
    const url = `${window.location.origin}/portal/${data.token}`;
    setPortalUrl(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Enlace copiado al portapapeles');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Vehículo no encontrado</p>
      </div>
    );
  }

  const days = daysAgo(vehicle.created_at);
  const currentIdx = STATUS_ORDER.indexOf(vehicle.status);
  const activeStatuses = STATUS_ORDER.filter((s) => s !== 'entregado');

  return (
    <AppShell>
      {/* Top bar */}
      <div className="border-b border-border/50 bg-card/50 px-4 py-3 flex items-center gap-3 sticky top-14 z-30 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-mono font-bold tracking-wider text-lg">{vehicle.plate}</span>
        <VehicleStatusBadge status={vehicle.status} />
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', PRIORITY_COLOR[vehicle.priority])}>
          {PRIORITY_LABELS[vehicle.priority]}
        </span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {days === 0 ? 'Entrada hoy' : `${days} día${days !== 1 ? 's' : ''} en taller`}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4 pb-12">

        {/* Status progress bar */}
        <div className="border border-border/40 rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium mb-3">Progresión del vehículo</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {activeStatuses.map((s, i) => {
              const done = STATUS_ORDER.indexOf(s) < currentIdx;
              const active = s === vehicle.status;
              return (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => !active && updateStatus(s)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-full font-medium border transition-all',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : done
                        ? 'bg-muted/50 text-muted-foreground border-border/30 line-through'
                        : 'text-muted-foreground border-border/30 hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                  {i < activeStatuses.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30">
            {vehicle.status === 'control_calidad' ? (
              <Button
                onClick={() => setQualityOpen(true)}
                className="gap-2 bg-[hsl(280_65%_55%)] hover:bg-[hsl(280_65%_50%)] text-white"
                size="sm"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Hacer Control de Calidad
              </Button>
            ) : vehicle.status !== 'entregado' ? (
              <Button
                size="sm"
                onClick={() => {
                  const next = STATUS_ORDER[currentIdx + 1];
                  if (next) updateStatus(next);
                }}
                className="gap-2"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Avanzar a {STATUS_LABELS[STATUS_ORDER[currentIdx + 1]] ?? '—'}
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="gap-2 border-border/50" onClick={generatePortalLink}>
              <LinkIcon className="h-3.5 w-3.5" /> Enlace cliente
            </Button>
          </div>

          {portalUrl && (
            <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg p-2 mt-2">
              <span className="truncate flex-1 font-mono">{portalUrl}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => navigator.clipboard.writeText(portalUrl)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Datos del vehículo + cliente */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Vehículo */}
          <div className="border border-border/40 rounded-xl bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" /> Vehículo
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Matrícula</span>
                <span className="font-mono font-bold">{vehicle.plate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Marca / Modelo</span>
                <span className="font-medium">{vehicle.brand} {vehicle.model}</span>
              </div>
              {vehicle.year && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Año</span>
                  <span>{vehicle.year}</span>
                </div>
              )}
              {vehicle.color && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Palette className="h-3 w-3" /> Color
                  </span>
                  <span>{vehicle.color}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entrada</span>
                <span>{new Date(vehicle.created_at).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
            {vehicle.client_description && (
              <div className="border-t border-border/30 pt-3">
                <p className="text-xs text-muted-foreground mb-1">Motivo de entrada</p>
                <p className="text-sm">{vehicle.client_description}</p>
              </div>
            )}
          </div>

          {/* Cliente */}
          <div className="border border-border/40 rounded-xl bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Cliente
            </h3>
            {vehicle.owner ? (
              <div className="space-y-2">
                <p className="font-medium">{vehicle.owner.name}</p>
                {vehicle.owner.phone && (
                  <a
                    href={`tel:${vehicle.owner.phone}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {vehicle.owner.phone}
                  </a>
                )}
                {vehicle.owner.email && (
                  <a
                    href={`mailto:${vehicle.owner.email}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {vehicle.owner.email}
                  </a>
                )}
                {!vehicle.owner.phone && !vehicle.owner.email && (
                  <p className="text-xs text-muted-foreground">Sin datos de contacto</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cliente asignado</p>
            )}
          </div>
        </div>

        {/* Notas de trabajo */}
        <div className="border border-border/40 rounded-xl bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notas del trabajo</h3>
            {!editingNotes ? (
              <button
                onClick={() => setEditingNotes(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" /> Editar
              </button>
            ) : (
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity"
              >
                {savingNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Guardar
              </button>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe los trabajos realizados, observaciones técnicas..."
              className="w-full text-sm bg-muted/30 border border-border/50 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
            />
          ) : (
            <p className="text-sm text-muted-foreground min-h-[60px]">
              {vehicle.work_summary || 'Sin notas. Haz clic en Editar para añadir.'}
            </p>
          )}
        </div>

        {/* Fotos */}
        <div className="border border-border/40 rounded-xl bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            Fotos del vehículo
          </h3>
          <VehiclePhotos vehicleId={vehicle.id} />
        </div>

        {/* Cronómetro */}
        <div className="border border-border/40 rounded-xl bg-card p-4">
          <WorkTimer vehicleId={vehicle.id} />
        </div>

        {/* Piezas */}
        <div className="border border-border/40 rounded-xl bg-card p-4">
          <PartsList vehicleId={vehicle.id} />
        </div>
      </div>

      <QualityCheckDialog
        vehicleId={vehicle.id}
        vehiclePlate={vehicle.plate}
        vehicleStatus={vehicle.status}
        open={qualityOpen}
        onOpenChange={setQualityOpen}
        onSuccess={fetchVehicle}
      />
    </AppShell>
  );
}
