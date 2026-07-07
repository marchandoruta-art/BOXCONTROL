import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, Square, Timer, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface TimeLog {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_minutes: number | null;
  user_id: string;
  profile?: { full_name: string | null };
}

export function WorkTimer({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  // Otro vehículo activo para este mecánico
  const [blockedByVehicle, setBlockedByVehicle] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    // Cronómetro activo en ESTE vehículo para este mecánico
    const { data: open } = await supabase
      .from('time_logs')
      .select('id, started_at')
      .eq('vehicle_id', vehicleId)
      .eq('user_id', user.id)
      .is('ended_at', null)
      .maybeSingle();

    if (open) {
      setActiveLogId(open.id);
      setStartedAt(new Date(open.started_at));
      setBlockedByVehicle(null);
    } else {
      setActiveLogId(null);
      setStartedAt(null);

      // Comprobar si el mecánico tiene otro vehículo activo
      const { data: otherActive } = await supabase
        .from('time_logs')
        .select('vehicle_id, vehicles(plate)')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .neq('vehicle_id', vehicleId)
        .maybeSingle();

      if (otherActive) {
        const plate = (otherActive as any).vehicles?.plate ?? 'otro vehículo';
        setBlockedByVehicle(plate);
      } else {
        setBlockedByVehicle(null);
      }
    }

    // Todos los logs de este vehículo con nombre del mecánico
    const { data: allLogs } = await supabase
      .from('time_logs')
      .select('id, started_at, ended_at, total_minutes, user_id, profile:profiles(full_name)')
      .eq('vehicle_id', vehicleId)
      .order('started_at', { ascending: false });

    const closed = (allLogs ?? []) as unknown as TimeLog[];
    setLogs(closed);
    setTotalMinutes(closed.reduce((s, l) => s + (l.total_minutes ?? 0), 0));
  }, [vehicleId, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const start = async () => {
    if (!user || !organizationId) return;
    if (blockedByVehicle) {
      toast.error(`Ya tienes el cronómetro activo en ${blockedByVehicle}. Para primero ese.`);
      return;
    }
    const { data, error } = await supabase
      .from('time_logs')
      .insert({ organization_id: organizationId, vehicle_id: vehicleId, user_id: user.id })
      .select()
      .single();
    if (error || !data) { toast.error('Error al iniciar el cronómetro'); return; }
    setActiveLogId(data.id);
    setStartedAt(new Date(data.started_at));
    toast.success('Cronómetro iniciado');
  };

  const stop = async () => {
    if (!activeLogId || !startedAt) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000));
    await supabase
      .from('time_logs')
      .update({ ended_at: new Date().toISOString(), total_minutes: minutes })
      .eq('id', activeLogId);
    toast.success(`${minutes} min registrados`);
    setActiveLogId(null);
    setStartedAt(null);
    setElapsed(0);
    load();
  };

  const fmt = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  const fmtMin = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-3">
      {/* Cronómetro activo */}
      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
        <Timer className={`h-4 w-4 shrink-0 ${activeLogId ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
        <div className="flex-1 text-sm">
          <p className="font-medium tabular-nums">
            {activeLogId ? fmt(elapsed) : 'Sin cronómetro activo'}
          </p>
          <p className="text-xs text-muted-foreground">
            Total acumulado en este vehículo: <span className="font-medium">{fmtMin(totalMinutes)}</span>
          </p>
        </div>
        {activeLogId ? (
          <Button size="sm" variant="destructive" onClick={stop} className="gap-1.5">
            <Square className="h-3.5 w-3.5" /> Parar
          </Button>
        ) : (
          <Button size="sm" onClick={start} disabled={!!blockedByVehicle} className="gap-1.5">
            <Play className="h-3.5 w-3.5" /> Iniciar
          </Button>
        )}
      </div>

      {/* Aviso bloqueo */}
      {blockedByVehicle && (
        <div className="flex items-center gap-2 text-xs text-[hsl(35_92%_55%)] bg-[hsl(35_92%_55%/0.1)] border border-[hsl(35_92%_55%/0.3)] rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Tienes el cronómetro activo en <span className="font-mono font-bold ml-1">{blockedByVehicle}</span>. Para primero ese para poder iniciar aquí.
        </div>
      )}

      {/* Historial de tiempos */}
      {logs.filter((l) => l.ended_at).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium px-1">Registros de tiempo</p>
          <div className="rounded-lg border border-border/30 overflow-hidden divide-y divide-border/20">
            {logs.filter((l) => l.ended_at).map((l) => (
              <div key={l.id} className="flex items-center justify-between px-3 py-2 text-xs bg-muted/10">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-muted-foreground">
                    {(l as any).profile?.full_name ?? 'Mecánico'}
                  </span>
                </div>
                <span className="text-muted-foreground">{fmtDate(l.started_at)}</span>
                <span className="font-medium">{fmtMin(l.total_minutes ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
