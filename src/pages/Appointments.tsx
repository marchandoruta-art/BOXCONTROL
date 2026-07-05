import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CalendarDays,
  Plus,
  Loader2,
  Clock,
  Car,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  owner_id: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  notes: string | null;
}

const STATUS_STYLES: Record<Appointment['status'], string> = {
  pendiente:   'bg-[hsl(35_92%_55%/0.15)] text-[hsl(35_92%_55%)] border-[hsl(35_92%_55%/0.3)]',
  confirmada:  'bg-[hsl(214_80%_55%/0.15)] text-[hsl(214_80%_55%)] border-[hsl(214_80%_55%/0.3)]',
  completada:  'bg-[hsl(142_68%_48%/0.15)] text-[hsl(142_68%_48%)] border-[hsl(142_68%_48%/0.3)]',
  cancelada:   'bg-[hsl(0_72%_60%/0.15)] text-[hsl(0_72%_60%)] border-[hsl(0_72%_60%/0.3)]',
};

const STATUS_LABELS: Record<Appointment['status'], string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function Appointments() {
  const { organization, organizationId } = useOrganization();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  // Form state
  const [form, setForm] = useState({
    vehicle_plate: '',
    vehicle_brand: '',
    vehicle_model: '',
    description: '',
    scheduled_at: '',
    duration_minutes: 60,
    notes: '',
  });

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('scheduled_at', { ascending: true });
    setAppointments((data as unknown as Appointment[]) ?? []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !form.description || !form.scheduled_at) return;
    setSaving(true);
    const { error } = await supabase.from('appointments').insert({
      organization_id: organizationId,
      ...form,
    });
    if (error) {
      toast.error('Error al guardar la cita');
    } else {
      toast.success('Cita creada');
      setDialogOpen(false);
      setForm({ vehicle_plate: '', vehicle_brand: '', vehicle_model: '', description: '', scheduled_at: '', duration_minutes: 60, notes: '' });
      load();
    }
    setSaving(false);
  };

  const changeStatus = async (id: string, status: Appointment['status']) => {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
    if (error) toast.error('Error al actualizar');
    else {
      toast.success(`Cita → ${STATUS_LABELS[status]}`);
      load();
    }
  };

  // Week calendar helpers
  const getWeekDays = () => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();
  const selectedAppts = appointments.filter((a) =>
    isSameDay(new Date(a.scheduled_at), selectedDate)
  );
  const todayAppts = appointments.filter((a) => {
    const d = new Date(a.scheduled_at);
    const now = new Date();
    return d >= now && d.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Citas y Agenda
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {todayAppts.length} citas próximas (7 días)
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" /> Nueva cita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle>Nueva cita</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Matrícula</Label>
                    <Input
                      value={form.vehicle_plate}
                      onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })}
                      placeholder="1234 ABC"
                      className="text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Marca</Label>
                    <Input
                      value={form.vehicle_brand}
                      onChange={(e) => setForm({ ...form, vehicle_brand: e.target.value })}
                      placeholder="Ford"
                      className="text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Modelo</Label>
                    <Input
                      value={form.vehicle_model}
                      onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
                      placeholder="Focus"
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descripción del trabajo *</Label>
                  <Input
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="ej. Revisión frenos + ITV"
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha y hora *</Label>
                    <Input
                      required
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                      className="text-sm h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duración (min)</Label>
                    <Input
                      type="number"
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                      min={15}
                      step={15}
                      className="text-sm h-8"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notas internas</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Opcional"
                    className="text-sm h-8"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cita'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Week strip */}
        <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} –{' '}
              {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7">
            {weekDays.map((day) => {
              const dayAppts = appointments.filter((a) => isSameDay(new Date(a.scheduled_at), day));
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 border-r last:border-r-0 border-border/30 transition-colors',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium uppercase tracking-wide',
                    isToday ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                  </span>
                  <span className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-full text-sm font-bold',
                    isToday ? 'bg-primary text-primary-foreground' : isSelected ? 'bg-primary/20 text-foreground' : 'text-foreground'
                  )}>
                    {day.getDate()}
                  </span>
                  {dayAppts.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day appointments */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            <span className="bg-muted rounded-full px-1.5 py-0.5 text-xs">{selectedAppts.length}</span>
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : selectedAppts.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border/50 rounded-xl">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground">Sin citas este día</p>
              <button
                onClick={() => setDialogOpen(true)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                + Añadir cita
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedAppts.map((appt) => (
                <div key={appt.id} className="border border-border/50 rounded-xl bg-card p-4 flex gap-4">
                  {/* Time */}
                  <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                    <span className="text-sm font-bold text-primary">{formatTime(appt.scheduled_at)}</span>
                    <span className="text-[10px] text-muted-foreground">{appt.duration_minutes}min</span>
                  </div>

                  {/* Divider */}
                  <div className="w-px bg-border/50" />

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{appt.description}</p>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', STATUS_STYLES[appt.status])}>
                        {STATUS_LABELS[appt.status]}
                      </span>
                    </div>
                    {(appt.vehicle_plate || appt.vehicle_brand) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {appt.vehicle_plate} {appt.vehicle_brand} {appt.vehicle_model}
                      </p>
                    )}
                    {appt.notes && (
                      <p className="text-xs text-muted-foreground/80">{appt.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    {appt.status === 'pendiente' && (
                      <button
                        onClick={() => changeStatus(appt.id, 'confirmada')}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-[hsl(214_80%_55%)]"
                        title="Confirmar"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {appt.status === 'confirmada' && (
                      <button
                        onClick={() => changeStatus(appt.id, 'completada')}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-[hsl(142_68%_48%)]"
                        title="Completar"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {appt.status !== 'cancelada' && appt.status !== 'completada' && (
                      <button
                        onClick={() => changeStatus(appt.id, 'cancelada')}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                        title="Cancelar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming list */}
        {todayAppts.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Próximas 7 días
            </h2>
            <div className="space-y-2">
              {todayAppts.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => setSelectedDate(new Date(appt.scheduled_at))}
                  className="border border-border/30 rounded-lg bg-card/50 px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-all"
                >
                  <span className="text-xs font-mono text-primary w-12">
                    {formatTime(appt.scheduled_at)}
                  </span>
                  <span className="text-xs text-muted-foreground w-20">
                    {formatDate(appt.scheduled_at)}
                  </span>
                  <span className="text-sm flex-1 truncate">{appt.description}</span>
                  {appt.vehicle_plate && (
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {appt.vehicle_plate}
                    </span>
                  )}
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', STATUS_STYLES[appt.status])}>
                    {STATUS_LABELS[appt.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
