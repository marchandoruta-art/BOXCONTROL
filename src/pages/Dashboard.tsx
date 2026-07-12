import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRole } from '@/hooks/useRole';
import {
  type Vehicle,
  type VehicleStatus,
  type VehiclePriority,
  STATUS_ORDER,
  STATUS_LABELS,
} from '@/lib/types';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { NewVehicleDialog } from '@/components/vehicles/NewVehicleDialog';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import {
  Loader2, Search, CheckCircle2, Car,
  LayoutGrid, List, Trophy, ChevronRight,
  Gauge, Wrench, FileText, Package, ShieldCheck,
  CircleDot, Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'active' | 'delivered';
type ViewMode = 'kanban' | 'list';

// ── Status colors (border-top de columna + acento de tarjeta) ──────────────
const STATUS_COLOR: Record<VehicleStatus, { border: string; bg: string; text: string; icon: React.ElementType }> = {
  recibido:         { border: 'border-t-[hsl(215_60%_55%)]',   bg: 'bg-[hsl(215_60%_55%/0.12)]',  text: 'text-[hsl(215_60%_65%)]',  icon: Car },
  presupuestar:     { border: 'border-t-[hsl(45_92%_55%)]',    bg: 'bg-[hsl(45_92%_55%/0.12)]',   text: 'text-[hsl(45_92%_65%)]',   icon: FileText },
  presupuestado:    { border: 'border-t-[hsl(185_60%_50%)]',   bg: 'bg-[hsl(185_60%_50%/0.12)]',  text: 'text-[hsl(185_60%_60%)]',  icon: CircleDot },
  en_reparacion:    { border: 'border-t-[hsl(25_95%_55%)]',    bg: 'bg-[hsl(25_95%_55%/0.12)]',   text: 'text-[hsl(25_95%_65%)]',   icon: Wrench },
  pendiente_piezas: { border: 'border-t-[hsl(0_72%_58%)]',     bg: 'bg-[hsl(0_72%_58%/0.12)]',    text: 'text-[hsl(0_72%_68%)]',    icon: Package },
  control_calidad:  { border: 'border-t-[hsl(280_60%_62%)]',   bg: 'bg-[hsl(280_60%_62%/0.12)]',  text: 'text-[hsl(280_60%_72%)]',  icon: ShieldCheck },
  terminado:        { border: 'border-t-[hsl(142_65%_48%)]',   bg: 'bg-[hsl(142_65%_48%/0.12)]',  text: 'text-[hsl(142_65%_58%)]',  icon: CheckCircle2 },
  entregado:        { border: 'border-t-[hsl(215_80%_60%)]',   bg: 'bg-[hsl(215_80%_60%/0.12)]',  text: 'text-[hsl(215_80%_70%)]',  icon: Truck },
};

const PRIORITY_COLORS: Record<VehiclePriority, string> = {
  baja:    'border-l-[hsl(215_60%_62%)]',
  normal:  'border-l-[hsl(215_15%_45%)]',
  alta:    'border-l-[hsl(35_92%_55%)]',
  urgente: 'border-l-[hsl(0_72%_60%)]',
};

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ── KPI por estado (barra superior) ──────────────────────────────────────────
function StatusKpi({
  status, count, active, onClick,
}: {
  status: VehicleStatus; count: number; active: boolean; onClick: () => void;
}) {
  const { bg, text, icon: Icon, border } = STATUS_COLOR[status];
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-transparent transition-all min-w-[72px]',
        active ? `${bg} border-opacity-60` : 'hover:bg-muted/40',
        active && border.replace('border-t-', 'border-')
      )}
    >
      <div className="flex items-center gap-1">
        <Icon className={cn('h-3.5 w-3.5', text)} />
        <span className="text-lg font-bold leading-none">{count}</span>
      </div>
      <span className="text-[9px] text-muted-foreground leading-tight text-center whitespace-nowrap">
        {STATUS_LABELS[status]}
      </span>
    </button>
  );
}

// ── Tarjeta de vehículo ───────────────────────────────────────────────────────
function VehicleCard({
  vehicle, onClick, onAdvance, onFinish,
}: {
  vehicle: Vehicle & { mileage?: number | null };
  onClick: () => void;
  onAdvance: (e: React.MouseEvent) => void;
  onFinish: (e: React.MouseEvent) => void;
}) {
  const days = daysAgo(vehicle.created_at);
  const currentIdx = STATUS_ORDER.indexOf(vehicle.status);
  const nextStatus = STATUS_ORDER[currentIdx + 1];
  const isTerminado = vehicle.status === 'terminado';
  const isEntregado = vehicle.status === 'entregado';
  const faltaKm = vehicle.mileage == null || vehicle.mileage === 0;
  const { border: statusBorder } = STATUS_COLOR[vehicle.status];

  return (
    <div
      className={cn(
        'rounded-lg border bg-card overflow-hidden transition-all duration-150',
        'border-t-4 border-l-4',
        statusBorder,
        PRIORITY_COLORS[vehicle.priority],
        'hover:shadow-lg hover:shadow-black/20'
      )}
    >
      {/* Banner ENTREGADO */}
      {isTerminado && (
        <button
          onClick={onFinish}
          className="w-full flex items-center justify-center gap-1.5 bg-[hsl(142_65%_44%)] hover:bg-[hsl(142_65%_38%)] text-white text-[10px] font-bold py-1.5 transition-colors uppercase tracking-wide"
        >
          <Trophy className="h-3 w-3" /> Marcar como entregado
        </button>
      )}

      {/* Cuerpo */}
      <div onClick={onClick} className="p-3 space-y-2 cursor-pointer hover:bg-muted/5 transition-colors">
        {/* Matrícula + días */}
        <div className="flex items-start justify-between gap-1">
          <span className="font-mono text-sm font-extrabold tracking-widest text-foreground">
            {vehicle.plate}
          </span>
          <span className={cn(
            'text-[9px] font-medium px-1.5 py-0.5 rounded',
            days > 7 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'
          )}>
            {days === 0 ? 'Hoy' : `${days}d`}
          </span>
        </div>

        {/* Marca modelo */}
        <p className="text-xs font-medium text-foreground/80">
          {vehicle.brand} {vehicle.model}
          {vehicle.year ? <span className="text-muted-foreground"> · {vehicle.year}</span> : null}
        </p>

        {/* Cliente */}
        {vehicle.owner?.name && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            {vehicle.owner.name}
          </p>
        )}

        {/* Alertas */}
        {faltaKm && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-2 py-0.5">
            <Gauge className="h-3 w-3" />
            Falta indicar km
          </div>
        )}

        {/* Footer: prioridad */}
        <div className="flex items-center gap-1 pt-0.5">
          {vehicle.priority === 'urgente' && (
            <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
              Urgente
            </span>
          )}
          {vehicle.priority === 'alta' && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded uppercase tracking-wide">
              Alta
            </span>
          )}
        </div>
      </div>

      {/* Banner avanzar estado */}
      {!isEntregado && !isTerminado && nextStatus && (
        <button
          onClick={onAdvance}
          className="w-full flex items-center justify-center gap-1 border-t border-border/30 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary text-[10px] font-medium py-1.5 transition-all"
        >
          <ChevronRight className="h-3 w-3" />
          {STATUS_LABELS[nextStatus]}
        </button>
      )}
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  const { can } = useRole();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [delivered, setDelivered] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | null>(null);

  const fetchVehicles = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const [{ data: active }, { data: done }] = await Promise.all([
      supabase
        .from('vehicles')
        .select('*, owner:owners(*)')
        .eq('organization_id', organizationId)
        .not('status', 'in', '("entregado")')
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicles')
        .select('*, owner:owners(*)')
        .eq('organization_id', organizationId)
        .eq('status', 'entregado')
        .order('updated_at', { ascending: false })
        .limit(50),
    ]);
    setVehicles((active as unknown as Vehicle[]) || []);
    setDelivered((done as unknown as Vehicle[]) || []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    if (!orgLoading && !organization) { navigate('/onboarding'); return; }
    if (organizationId) fetchVehicles();
  }, [organizationId, orgLoading, organization, navigate, fetchVehicles]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') { toast.success('¡Suscripción activada! Bienvenido a TallerControl.'); setSearchParams({}); }
    else if (checkout === 'cancelled') { toast.info('Pago cancelado. Puedes suscribirte cuando quieras.'); setSearchParams({}); }
  }, [searchParams, setSearchParams]);

  const handleAdvance = async (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    const next = STATUS_ORDER[STATUS_ORDER.indexOf(vehicle.status) + 1];
    if (!next) return;
    setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? { ...v, status: next } : v));
    const { error } = await supabase.from('vehicles').update({ status: next }).eq('id', vehicle.id);
    if (error) { toast.error('Error al actualizar'); fetchVehicles(); }
    else toast.success(`${vehicle.plate} → ${STATUS_LABELS[next]}`);
  };

  const handleFinish = async (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
    const { error } = await supabase.from('vehicles').update({ status: 'entregado' }).eq('id', vehicle.id);
    if (error) { toast.error('Error'); fetchVehicles(); }
    else toast.success(`✓ ${vehicle.plate} entregado`);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as VehicleStatus;
    const vehicle = vehicles.find((v) => v.id === result.draggableId);
    if (!vehicle || vehicle.status === newStatus) return;
    setVehicles((prev) => prev.map((v) => v.id === result.draggableId ? { ...v, status: newStatus } : v));
    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', result.draggableId);
    if (error) { toast.error('Error al actualizar estado'); fetchVehicles(); }
    else toast.success(`${vehicle.plate} → ${STATUS_LABELS[newStatus]}`);
  };

  const filterList = (list: Vehicle[]) => {
    let result = list;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((v) =>
        v.plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.owner?.name ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((v) => v.status === statusFilter);
    return result;
  };

  if (orgLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando taller...</p>
        </div>
      </div>
    );
  }

  const filteredActive = filterList(vehicles);
  const filteredDelivered = filterList(delivered);
  const activeStatuses = STATUS_ORDER.filter((s) => s !== 'entregado');

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}

      {/* ── Barra de contadores por estado ── */}
      <div className="border-b border-border/50 bg-card/40 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {/* Total */}
          <button
            onClick={() => setStatusFilter(null)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all min-w-[64px]',
              !statusFilter ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted/40'
            )}
          >
            <div className="flex items-center gap-1">
              <Car className="h-3.5 w-3.5 text-primary" />
              <span className="text-lg font-bold leading-none">{vehicles.length}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">En taller</span>
          </button>

          <div className="w-px h-8 bg-border/50 mx-1" />

          {activeStatuses.map((s) => (
            <StatusKpi
              key={s}
              status={s}
              count={vehicles.filter((v) => v.status === s).length}
              active={statusFilter === s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            />
          ))}

          <div className="w-px h-8 bg-border/50 mx-1" />

          {/* Entregados */}
          <button
            onClick={() => setTab('delivered')}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-transparent hover:bg-muted/40 transition-all min-w-[64px]"
          >
            <div className="flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-[hsl(215_80%_60%)]" />
              <span className="text-lg font-bold leading-none">{delivered.length}</span>
            </div>
            <span className="text-[9px] text-muted-foreground">Entregados</span>
          </button>
        </div>
      </div>

      {/* ── Sub-toolbar ── */}
      <div className="border-b border-border/50 bg-background/50 px-4 py-2 flex items-center gap-2 flex-wrap sticky top-14 z-30 backdrop-blur">
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setTab('active')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-all',
              tab === 'active' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            En taller <span className="ml-1 text-xs opacity-70">{vehicles.length}</span>
          </button>
          <button
            onClick={() => setTab('delivered')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-all',
              tab === 'delivered' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Entregados <span className="ml-1 text-xs opacity-70">{delivered.length}</span>
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Matrícula, marca, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-muted/50 border-border/50"
          />
        </div>

        {/* Alertas activas */}
        {statusFilter && (
          <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
            {STATUS_LABELS[statusFilter]}
            <button onClick={() => setStatusFilter(null)} className="hover:text-foreground ml-0.5">×</button>
          </span>
        )}

        {tab === 'active' && (
          <div className="hidden sm:flex gap-1 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn('p-1 rounded transition-colors', viewMode === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1 rounded transition-colors', viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="ml-auto">
          {can('canCreateVehicle') && <NewVehicleDialog onSuccess={fetchVehicles} />}
        </div>
      </div>

      {/* ── Kanban ── */}
      {tab === 'active' && viewMode === 'kanban' && (
        <div className="p-4 overflow-x-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 min-w-max">
              {activeStatuses.map((status) => {
                const col = STATUS_COLOR[status];
                const ColIcon = col.icon;
                const columnVehicles = filteredActive.filter((v) => v.status === status);
                return (
                  <Droppable key={status} droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'w-60 flex-shrink-0 rounded-xl border-2 border-t-4 bg-card/40 p-2 transition-colors',
                          col.border,
                          snapshot.isDraggingOver ? 'border-primary/40 bg-primary/5' : 'border-border/30'
                        )}
                      >
                        {/* Column header */}
                        <div className="flex items-center justify-between px-1 pb-2.5 pt-1.5">
                          <div className="flex items-center gap-1.5">
                            <ColIcon className={cn('h-3.5 w-3.5', col.text)} />
                            <span className={cn('text-xs font-bold uppercase tracking-wide', col.text)}>
                              {STATUS_LABELS[status]}
                            </span>
                          </div>
                          <span className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded-full',
                            columnVehicles.length > 0 ? `${col.bg} ${col.text}` : 'bg-muted text-muted-foreground'
                          )}>
                            {columnVehicles.length}
                          </span>
                        </div>

                        {/* Cards */}
                        <div className="space-y-2 min-h-[80px]">
                          {columnVehicles.map((vehicle, index) => (
                            <Draggable key={vehicle.id} draggableId={vehicle.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  style={{ ...dragProvided.draggableProps.style, opacity: dragSnapshot.isDragging ? 0.9 : 1 }}
                                >
                                  <VehicleCard
                                    vehicle={vehicle as any}
                                    onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                                    onAdvance={(e) => handleAdvance(e, vehicle)}
                                    onFinish={(e) => handleFinish(e, vehicle)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columnVehicles.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-6 text-muted-foreground/30 text-xs">Sin vehículos</div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* ── Lista (activos) ── */}
      {tab === 'active' && viewMode === 'list' && (
        <div className="max-w-4xl mx-auto p-4 space-y-2">
          {filteredActive.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Car className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin vehículos en taller.</p>
            </div>
          ) : filteredActive.map((vehicle) => {
            const { text, bg } = STATUS_COLOR[vehicle.status];
            const faltaKm = !(vehicle as any).mileage;
            return (
              <div
                key={vehicle.id}
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                className={cn(
                  'rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-black/10',
                  'transition-all flex items-center gap-4 border-l-4',
                  PRIORITY_COLORS[vehicle.priority]
                )}
              >
                <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 items-center">
                  <div>
                    <span className="font-mono text-sm font-bold">{vehicle.plate}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{vehicle.brand} {vehicle.model}</p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">{vehicle.owner?.name ?? '—'}</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    {faltaKm && (
                      <span className="flex items-center gap-1 text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
                        <Gauge className="h-2.5 w-2.5" /> Falta km
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', bg, text)}>
                      {STATUS_LABELS[vehicle.status]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{daysAgo(vehicle.created_at)}d</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Entregados ── */}
      {tab === 'delivered' && (
        <div className="max-w-4xl mx-auto p-4 space-y-2">
          {filteredDelivered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin vehículos entregados{search ? ' que coincidan' : ' aún'}.</p>
            </div>
          ) : filteredDelivered.map((vehicle) => (
            <div
              key={vehicle.id}
              onClick={() => navigate(`/vehicles/${vehicle.id}`)}
              className="rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{vehicle.plate}</span>
                  <VehicleStatusBadge status={vehicle.status} className="text-[10px]" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {vehicle.brand} {vehicle.model}{vehicle.owner?.name ? ` · ${vehicle.owner.name}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{new Date(vehicle.updated_at).toLocaleDateString('es-ES')}</p>
                <p className="text-[10px] text-muted-foreground">{daysAgo(vehicle.created_at)}d en taller</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
