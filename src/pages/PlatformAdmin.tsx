import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import {
  Loader2, Search, Building2, Users, Car, CreditCard,
  AlertTriangle, CheckCircle2, Clock, XCircle, Wrench,
  Mail, RefreshCw, TrendingUp, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_OWNER = 'marchandoruta@gmail.com';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  deleted_at: string | null;
  created_at: string;
  owner_email: string;
  owner_name: string;
  member_count: number;
  vehicle_count: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:    { label: 'Activa',          color: 'text-green-400',   bg: 'bg-green-400/10 border-green-400/20',   icon: CheckCircle2 },
  trialing:  { label: 'Prueba',          color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',   icon: Clock },
  past_due:  { label: 'Pago pendiente',  color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',       icon: AlertTriangle },
  canceled:  { label: 'Cancelada',       color: 'text-slate-400',   bg: 'bg-slate-400/10 border-slate-400/20',   icon: XCircle },
};

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function PlatformAdmin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('platform_admin_get_orgs');
    if (error) {
      console.error(error);
    } else {
      setOrgs((data as OrgRow[]) ?? []);
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.email !== PLATFORM_OWNER) {
      navigate('/dashboard');
      return;
    }
    load();
  }, [user, authLoading, navigate, load]);

  if (authLoading || (!user)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (user.email !== PLATFORM_OWNER) return null;

  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.name.toLowerCase().includes(q) || o.owner_email.toLowerCase().includes(q) || o.owner_name?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || o.subscription_status === filter || (filter === 'deleted' && o.deleted_at);
    return matchSearch && matchFilter;
  });

  // KPIs
  const total   = orgs.filter(o => !o.deleted_at).length;
  const active  = orgs.filter(o => o.subscription_status === 'active' && !o.deleted_at).length;
  const trialing = orgs.filter(o => o.subscription_status === 'trialing' && !o.deleted_at).length;
  const issues  = orgs.filter(o => (o.subscription_status === 'past_due' || o.subscription_status === 'canceled') && !o.deleted_at).length;
  const deleted = orgs.filter(o => o.deleted_at).length;
  const trialExpired = orgs.filter(o => {
    if (o.subscription_status !== 'trialing' || o.deleted_at) return false;
    const d = daysLeft(o.trial_ends_at);
    return d !== null && d <= 0;
  }).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Panel de Propietario</h1>
            <p className="text-xs text-muted-foreground mt-0.5">TallerControl · Gestión de talleres suscritos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Actualizado {lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border/50 hover:bg-muted/40"
          >
            ← Mi taller
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total talleres',   value: total,        icon: Building2,    color: 'text-blue-400',   bg: 'bg-blue-400/10' },
            { label: 'Suscritos',        value: active,       icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-400/10' },
            { label: 'En prueba',        value: trialing,     icon: Clock,        color: 'text-amber-400',  bg: 'bg-amber-400/10' },
            { label: 'Trial expirado',   value: trialExpired, icon: ShieldAlert,  color: 'text-orange-400', bg: 'bg-orange-400/10' },
            { label: 'Con incidencias',  value: issues,       icon: AlertTriangle,color: 'text-red-400',    bg: 'bg-red-400/10' },
            { label: 'Eliminados',       value: deleted,      icon: XCircle,      color: 'text-slate-400',  bg: 'bg-slate-400/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border/50 bg-card p-4">
              <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-3', bg)}>
                <Icon className={cn('h-4 w-4', color)} />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Alertas críticas */}
        {(issues > 0 || trialExpired > 0) && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-400">Requiere atención</p>
              {issues > 0 && <p className="text-xs text-muted-foreground">{issues} taller{issues > 1 ? 'es' : ''} con pago pendiente o suscripción cancelada</p>}
              {trialExpired > 0 && <p className="text-xs text-muted-foreground">{trialExpired} taller{trialExpired > 1 ? 'es' : ''} con período de prueba expirado sin suscribirse</p>}
            </div>
          </div>
        )}

        {/* Filtros + búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar taller, email, nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/60"
            />
          </div>
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1 flex-wrap">
            {[
              { key: 'all',      label: 'Todos' },
              { key: 'active',   label: 'Activos' },
              { key: 'trialing', label: 'Prueba' },
              { key: 'past_due', label: 'Pago pendiente' },
              { key: 'canceled', label: 'Cancelados' },
              { key: 'deleted',  label: 'Eliminados' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-all',
                  filter === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sin talleres que coincidan.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border/50 bg-muted/20 text-xs text-muted-foreground font-medium">
              <div className="col-span-3">Taller</div>
              <div className="col-span-2">Propietario</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-2">Vence / Renueva</div>
              <div className="col-span-1 text-center">Miembros</div>
              <div className="col-span-1 text-center">Vehículos</div>
              <div className="col-span-1 text-right">Alta</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/30">
              {filtered.map((org) => {
                const st = STATUS_CONFIG[org.deleted_at ? 'canceled' : org.subscription_status] ?? STATUS_CONFIG.trialing;
                const StatusIcon = st.icon;
                const isExpired = org.subscription_status === 'trialing' && daysLeft(org.trial_ends_at) !== null && daysLeft(org.trial_ends_at)! <= 0;
                const renewDate = org.subscription_status === 'active' ? org.subscription_ends_at : org.trial_ends_at;
                const dLeft = daysLeft(renewDate);

                return (
                  <div key={org.id} className={cn(
                    'grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-muted/10 transition-colors text-sm',
                    org.deleted_at && 'opacity-50',
                    (org.subscription_status === 'past_due' || isExpired) && 'bg-red-400/5'
                  )}>
                    {/* Taller */}
                    <div className="col-span-3 min-w-0">
                      <p className="font-semibold truncate">{org.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{org.slug}</p>
                    </div>

                    {/* Propietario */}
                    <div className="col-span-2 min-w-0">
                      <p className="text-xs truncate">{org.owner_name || '—'}</p>
                      <a
                        href={`mailto:${org.owner_email}`}
                        className="text-xs text-primary hover:underline truncate flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-2.5 w-2.5 shrink-0" />
                        {org.owner_email}
                      </a>
                    </div>

                    {/* Estado */}
                    <div className="col-span-2">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', st.bg, st.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {org.deleted_at ? 'Eliminado' : st.label}
                      </span>
                      {isExpired && !org.deleted_at && (
                        <p className="text-[10px] text-red-400 mt-0.5">Trial expirado</p>
                      )}
                    </div>

                    {/* Vence */}
                    <div className="col-span-2">
                      <p className="text-xs">{fmt(renewDate)}</p>
                      {dLeft !== null && (
                        <p className={cn('text-[10px]', dLeft <= 3 ? 'text-red-400' : dLeft <= 7 ? 'text-amber-400' : 'text-muted-foreground')}>
                          {dLeft > 0 ? `${dLeft}d restantes` : `Expiró hace ${Math.abs(dLeft)}d`}
                        </p>
                      )}
                    </div>

                    {/* Miembros */}
                    <div className="col-span-1 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {org.member_count}
                      </div>
                    </div>

                    {/* Vehículos */}
                    <div className="col-span-1 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs">
                        <Car className="h-3 w-3 text-muted-foreground" />
                        {org.vehicle_count}
                      </div>
                    </div>

                    {/* Alta */}
                    <div className="col-span-1 text-right">
                      <p className="text-xs text-muted-foreground">{fmt(org.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border/30 bg-muted/10 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{filtered.length} taller{filtered.length !== 1 ? 'es' : ''}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {active} suscritos · {trialing} en prueba
              </div>
            </div>
          </div>
        )}

        {/* Plan */}
        <div className="rounded-xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Resumen de ingresos estimados</h2>
            <span className="text-xs text-muted-foreground">(basado en plan Profesional 39€/mes)</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-green-400">{(active * 39).toLocaleString('es-ES')}€</p>
              <p className="text-xs text-muted-foreground">MRR estimado</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{(active * 39 * 12).toLocaleString('es-ES')}€</p>
              <p className="text-xs text-muted-foreground">ARR estimado</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">{trialing}</p>
              <p className="text-xs text-muted-foreground">Potenciales conversiones</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
