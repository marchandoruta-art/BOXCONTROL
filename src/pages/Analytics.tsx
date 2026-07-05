import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Car, Clock, Users, TrendingUp } from 'lucide-react';
import { type VehicleStatus, STATUS_LABELS } from '@/lib/types';

interface MechanicStat {
  user_id: string;
  full_name: string;
  total_minutes: number;
}

interface StatusCount {
  status: VehicleStatus;
  count: number;
}

const RANGE_OPTIONS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
];

const fmt = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function Analytics() {
  const { organization, organizationId } = useOrganization();
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [vehiclesFinished, setVehiclesFinished] = useState(0);
  const [mechanicStats, setMechanicStats] = useState<MechanicStat[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [totalHours, setTotalHours] = useState(0);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const since = new Date(Date.now() - rangeDays * 86400000).toISOString();

    const [
      { data: finishedRows },
      { data: timeLogs },
      { data: activeVehicles },
      { data: profiles },
    ] = await Promise.all([
      supabase
        .from('vehicle_status_history')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('status', 'terminado')
        .gte('changed_at', since),
      supabase
        .from('time_logs')
        .select('user_id, total_minutes')
        .eq('organization_id', organizationId)
        .gte('started_at', since)
        .not('total_minutes', 'is', null),
      supabase
        .from('vehicles')
        .select('status')
        .eq('organization_id', organizationId)
        .not('status', 'in', '("entregado")'),
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('organization_id', organizationId),
    ]);

    setVehiclesFinished(finishedRows?.length ?? 0);

    // Agrupar horas por mecánico
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
    const minutesByUser: Record<string, number> = {};
    for (const log of timeLogs ?? []) {
      minutesByUser[log.user_id] = (minutesByUser[log.user_id] ?? 0) + (log.total_minutes ?? 0);
    }
    const stats: MechanicStat[] = Object.entries(minutesByUser)
      .map(([user_id, total_minutes]) => ({
        user_id,
        full_name: profileMap[user_id] ?? 'Desconocido',
        total_minutes,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);
    setMechanicStats(stats);
    setTotalHours(Object.values(minutesByUser).reduce((a, b) => a + b, 0));

    // Contar por estado
    const countMap: Record<string, number> = {};
    for (const v of activeVehicles ?? []) {
      countMap[v.status] = (countMap[v.status] ?? 0) + 1;
    }
    setStatusCounts(
      Object.entries(countMap).map(([status, count]) => ({
        status: status as VehicleStatus,
        count,
      }))
    );

    setLoading(false);
  }, [organizationId, rangeDays]);

  useEffect(() => {
    load();
  }, [load]);

  const maxMinutes = Math.max(...mechanicStats.map((s) => s.total_minutes), 1);

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}
      <div className="max-w-4xl mx-auto p-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Analítica</h1>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setRangeDays(days)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  rangeDays === days
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Car className="h-4 w-4" />
                    <span className="text-xs">Vehículos terminados</span>
                  </div>
                  <p className="text-3xl font-bold">{vehiclesFinished}</p>
                  <p className="text-xs text-muted-foreground">últimos {rangeDays} días</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Horas trabajadas</span>
                  </div>
                  <p className="text-3xl font-bold">{Math.floor(totalHours / 60)}</p>
                  <p className="text-xs text-muted-foreground">últimos {rangeDays} días</p>
                </CardContent>
              </Card>
              <Card className="col-span-2 sm:col-span-1">
                <CardContent className="pt-5 pb-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">En taller ahora</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {statusCounts.reduce((a, s) => a + s.count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">vehículos activos</p>
                </CardContent>
              </Card>
            </div>

            {/* Estado actual del taller */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="h-4 w-4" /> Estado actual del taller
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusCounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin vehículos activos.</p>
                ) : (
                  <div className="space-y-2">
                    {statusCounts.map(({ status, count }) => {
                      const total = statusCounts.reduce((a, s) => a + s.count, 0);
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={status} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{STATUS_LABELS[status]}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Horas por mecánico */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" /> Horas por mecánico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mechanicStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin registros de tiempo en este período.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {mechanicStats.map((s) => {
                      const pct = Math.round((s.total_minutes / maxMinutes) * 100);
                      return (
                        <div key={s.user_id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">{s.full_name}</span>
                            <span className="text-muted-foreground">{fmt(s.total_minutes)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-status-quality transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
