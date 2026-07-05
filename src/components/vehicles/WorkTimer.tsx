import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Play, Square, Timer } from 'lucide-react';
import { toast } from 'sonner';

export function WorkTimer({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
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
    }

    const { data: closed } = await supabase
      .from('time_logs')
      .select('total_minutes')
      .eq('vehicle_id', vehicleId)
      .not('total_minutes', 'is', null);
    setTotalMinutes((closed ?? []).reduce((sum, l) => sum + (l.total_minutes ?? 0), 0));
  }, [vehicleId, user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const start = async () => {
    if (!user || !organizationId) return;
    const { data, error } = await supabase
      .from('time_logs')
      .insert({ organization_id: organizationId, vehicle_id: vehicleId, user_id: user.id })
      .select()
      .single();
    if (error || !data) {
      toast.error('Error al iniciar el cronómetro');
      return;
    }
    setActiveLogId(data.id);
    setStartedAt(new Date(data.started_at));
  };

  const stop = async () => {
    if (!activeLogId || !startedAt) return;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000));
    await supabase.from('time_logs').update({ ended_at: new Date().toISOString(), total_minutes: minutes }).eq('id', activeLogId);
    toast.success(`${minutes} min registrados en este vehículo`);
    setActiveLogId(null);
    setStartedAt(null);
    setElapsed(0);
    load();
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? `${h}h ` : ''}${m}m ${s}s`;
  };

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <Timer className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium">{activeLogId ? formatTime(elapsed) : 'Sin cronómetro activo'}</p>
        <p className="text-xs text-muted-foreground">Total acumulado: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
      </div>
      {activeLogId ? (
        <Button size="sm" variant="destructive" onClick={stop} className="gap-1.5">
          <Square className="h-3.5 w-3.5" /> Parar
        </Button>
      ) : (
        <Button size="sm" onClick={start} className="gap-1.5">
          <Play className="h-3.5 w-3.5" /> Iniciar
        </Button>
      )}
    </div>
  );
}
