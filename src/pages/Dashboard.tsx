import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
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
  Loader2,
  Search,
  CheckCircle2,
  Car,
  AlertTriangle,
  Package,
  ShieldCheck,
  Clock,
  LayoutGrid,
  List,
  Filter,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'active' | 'delivered';
type ViewMode = 'kanban' | 'list';

const PRIORITY_COLORS: Record<VehiclePriority, string> = {
  baja: 'border-l-[hsl(215_60%_62%)]',
  normal: 'border-l-[hsl(215_15%_45%)]',
  alta: 'border-l-[hsl(35_92%_55%)]',
  urgente: 'border-l-[hsl(0_72%_60%)]',
};

const PRIORITY_DOT: Record<VehiclePriority, string> = {
  baja: 'bg-[hsl(215_60%_62%)]',
  normal: 'bg-[hsl(215_15%_45%)]',
  alta: 'bg-[hsl(35_92%_55%)]',
  urgente: 'bg-[hsl(0_72%_60%)]',
};

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'kpi-card flex items-center gap-3 text-left transition-all hover:border-primary/40',
        active && 'border-primary/60 bg-primary/5',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </button>
  );
}

function VehicleCard({
  vehicle,
  onClick,
  onAdvance,
  onFinish,
  dragProps,
}: {
  vehicle: Vehicle;
  onClick: () => void;
  onAdvance: (e: React.MouseEvent) => void;
  onFinish: (e: React.MouseEvent) => void;
  dragProps?: Record<string, unknown>;
}) {
  const days = daysAgo(vehicle.created_at);
  const currentIdx = STATUS_ORDER.indexOf(vehicle.status);
  const nextStatus = STATUS_ORDER[currentIdx + 1];
  const isTerminado = vehicle.status === 'terminado';
  const isEntregado = vehicle.status === 'entregado';

  return (
    <div
      {...dragProps}
      className={cn(
        'rounded-md border bg-card overflow-hidden',
        'transition-all duration-150 border-l-4',
        PRIORITY_COLORS[vehicle.priority]
      )}
    >
      {/* Banner verde — dar por terminado (solo en terminado) */}
      {isTerminado && (
        <button
          onClick={onFinish}
          className="w-full flex items-center justify-center gap-2 bg-[hsl(142_68%_48%)] hover:bg-[hsl(142_68%_42%)] text-white text-xs font-bold py-1.5 transition-colors"
        >
          <Trophy className="h-3.5 w-3.5" /> MARCAR COMO ENTREGADO
        </button>
      )}

      {/* Cuerpo de la tarjeta */}
      <div
        onClick={onClick}
        className="p-3 space-y-2 cursor-pointer hover:bg-muted/10 transition-colors"
      >
        {/* Row 1: plate + status */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-sm font-bold tracking-wider text-foreground">
            {vehicle.plate}
          </span>
          <VehicleStatusBadge status={vehicle.status} className="text-[10px] shrink-0" />
        </div>

        {/* Row 2: brand model */}
        <p className="text-xs font-medium text-muted-foreground">
          {vehicle.brand} {vehicle.model}
          {vehicle.year ? ` · ${vehicle.year}` : ''}
        </p>

        {/* Row 3: owner */}
        {vehicle.owner?.name && (
          <p className="text-xs text-muted-foreground/80 truncate flex items-center gap-1">
            <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50" />
            {vehicle.owner.name}
          </p>
        )}

        {/* Row 4: meta */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{days === 0 ? 'Hoy' : `${days}d`}</span>
          </div>
          <div className={cn('h-2 w-2 rounded-full', PRIORITY_DOT[vehicle.priority])} title={vehicle.priority} />
        </div>
      </div>

      {/* Banner avanzar estado */}
      {!isEntregado && !isTerminado && nextStatus && (
        <button
          onClick={onAdvance}
          className="w-full flex items-center justify-center gap-1.5 border-t border-border/30 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary text-[10px] font-medium py-1.5 transition-all"
        >
          <ChevronRight className="h-3 w-3" />
          Pasar a {STATUS_LABELS[nextStatus]}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization, organizationId, loading: orgLoading } = useOrganization();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [delivered, setDelivered] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<VehiclePriority | null>(null);

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
    if (!orgLoading && !organization) {
      navigate('/onboarding');
      return;
    }
    if (organizationId) fetchVehicles();
  }, [organizationId, orgLoading, organization, navigate, fetchVehicles]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success('¡Suscripción activada! Bienvenido a TallerControl Pro.');
      setSearchParams({});
    } else if (checkout === 'cancelled') {
      toast.info('Pago cancelado. Puedes suscribirte cuando quieras.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleAdvance = async (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    const currentIdx = STATUS_ORDER.indexOf(vehicle.status);
    const next = STATUS_ORDER[currentIdx + 1];
    if (!next) return;
    if (vehicle.status !== 'control_calidad' && next === 'terminado') {
      toast.warning('Debe pasar primero por Control de Calidad');
      return;
    }
    setVehicles((prev) => prev.map((v) => v.id === vehicle.id ? { ...v, status: next } : v));
    const { error } = await supabase.from('vehicles').update({ status: next }).eq('id', vehicle.id);
    if (error) { toast.error('Error al actualizar'); fetchVehicles(); }
    else toast.success(`${vehicle.plate} → ${STATUS_LABELS[next]}`);
  };

  const handleFinish = async (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
    const { error } = await supabase.from('vehicles').update({ status: 'entregado' }).eq('id', vehicle.id);
    if (error) { toast.error('Error al marcar como entregado'); fetchVehicles(); }
    else toast.success(`✓ ${vehicle.plate} entregado`);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as VehicleStatus;
    const vehicleId = result.draggableId;
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle || vehicle.status === newStatus) return;

    if (vehicle.status !== 'control_calidad' && newStatus === 'terminado') {
      toast.warning('Este vehículo debe pasar primero por Control de Calidad');
      return;
    }

    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? { ...v, status: newStatus } : v)));
    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', vehicleId);
    if (error) {
      toast.error('Error al actualizar estado');
      fetchVehicles();
    } else {
      toast.success(`${vehicle.plate} → ${STATUS_LABELS[newStatus]}`);
    }
  };

  const filterList = (list: Vehicle[]) => {
    let result = list;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (v) =>
          v.plate.toLowerCase().includes(q) ||
          v.brand.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          (v.owner?.name ?? '').toLowerCase().includes(q)
      );
    }
    if (priorityFilter) {
      result = result.filter((v) => v.priority === priorityFilter);
    }
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

  // KPI counts
  const urgentes = vehicles.filter((v) => v.priority === 'urgente').length;
  const pendientePiezas = vehicles.filter((v) => v.status === 'pendiente_piezas').length;
  const enCalidad = vehicles.filter((v) => v.status === 'control_calidad').length;

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}

      {/* KPI Bar */}
      <div className="border-b border-border/50 bg-card/30 px-4 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl">
          <KpiCard
            icon={Car}
            label="En taller"
            value={vehicles.length}
            color="bg-primary/15 text-primary"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Urgentes"
            value={urgentes}
            color="bg-[hsl(0_72%_60%/0.15)] text-[hsl(0_72%_60%)]"
            active={priorityFilter === 'urgente'}
            onClick={() => setPriorityFilter(priorityFilter === 'urgente' ? null : 'urgente')}
          />
          <KpiCard
            icon={Package}
            label="Esperando piezas"
            value={pendientePiezas}
            color="bg-[hsl(35_92%_55%/0.15)] text-[hsl(35_92%_55%)]"
          />
          <KpiCard
            icon={ShieldCheck}
            label="Control calidad"
            value={enCalidad}
            color="bg-[hsl(280_65%_65%/0.15)] text-[hsl(280_65%_65%)]"
          />
        </div>
      </div>

      {/* Sub-toolbar */}
      <div className="border-b border-border/50 bg-background/50 px-4 py-2 flex items-center gap-2 flex-wrap sticky top-14 z-30 backdrop-blur">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setTab('active')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-all',
              tab === 'active'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            En taller
            <span className="ml-1.5 text-xs opacity-70">{vehicles.length}</span>
          </button>
          <button
            onClick={() => setTab('delivered')}
            className={cn(
              'px-3 py-1 rounded-md text-sm font-medium transition-all',
              tab === 'delivered'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Entregados
            <span className="ml-1.5 text-xs opacity-70">{delivered.length}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Matrícula, marca, cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm bg-muted/50 border-border/50"
          />
        </div>

        {/* Priority quick filters */}
        {tab === 'active' && (
          <div className="hidden sm:flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            {(['urgente', 'alta'] as VehiclePriority[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium transition-all border',
                  priorityFilter === p
                    ? p === 'urgente'
                      ? 'bg-[hsl(0_72%_60%/0.2)] text-[hsl(0_72%_60%)] border-[hsl(0_72%_60%/0.4)]'
                      : 'bg-[hsl(35_92%_55%/0.2)] text-[hsl(35_92%_55%)] border-[hsl(35_92%_55%/0.4)]'
                    : 'text-muted-foreground border-border/50 hover:border-border'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* View mode toggle */}
        {tab === 'active' && (
          <div className="ml-auto flex gap-1 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'p-1 rounded transition-colors',
                viewMode === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1 rounded transition-colors',
                viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className={tab === 'active' ? '' : 'ml-auto'}>
          <NewVehicleDialog onSuccess={fetchVehicles} />
        </div>
      </div>

      {/* Kanban view */}
      {tab === 'active' && viewMode === 'kanban' && (
        <div className="p-4 overflow-x-auto">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-3 min-w-max">
              {STATUS_ORDER.filter((s) => s !== 'entregado').map((status) => {
                const columnVehicles = filteredActive.filter((v) => v.status === status);
                return (
                  <Droppable key={status} droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'w-64 flex-shrink-0 rounded-xl border bg-card/50 p-2 transition-colors',
                          snapshot.isDraggingOver && 'border-primary/40 bg-primary/5'
                        )}
                      >
                        {/* Column header */}
                        <div className="flex items-center justify-between px-1 pb-2.5 pt-1">
                          <div className="flex items-center gap-2">
                            <VehicleStatusBadge status={status} className="text-[10px]" />
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-medium">
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
                                  style={{
                                    ...dragProvided.draggableProps.style,
                                    opacity: dragSnapshot.isDragging ? 0.9 : 1,
                                  }}
                                >
                                  <VehicleCard
                                    vehicle={vehicle}
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
                            <div className="text-center py-6 text-muted-foreground/40 text-xs">
                              Sin vehículos
                            </div>
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

      {/* List view (activos) */}
      {tab === 'active' && viewMode === 'list' && (
        <div className="max-w-4xl mx-auto p-4 space-y-2">
          {filteredActive.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Car className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Sin vehículos en taller.</p>
            </div>
          ) : (
            filteredActive.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                className={cn(
                  'rounded-lg border bg-card p-3 cursor-pointer hover:border-primary/40 hover:shadow-md hover:shadow-black/10',
                  'transition-all flex items-center gap-4 border-l-4',
                  PRIORITY_COLORS[vehicle.priority]
                )}
              >
                <div className="flex-1 min-w-0 grid grid-cols-3 gap-2 items-center">
                  <div>
                    <span className="font-mono text-sm font-bold">{vehicle.plate}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate hidden sm:block">
                    {vehicle.owner?.name ?? '—'}
                  </p>
                  <div className="flex items-center gap-2 justify-end">
                    <VehicleStatusBadge status={vehicle.status} className="text-[10px]" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {daysAgo(vehicle.created_at)}d
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lista de entregados */}
      {tab === 'delivered' && (
        <div className="max-w-4xl mx-auto p-4 space-y-2">
          {filteredDelivered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Sin vehículos entregados{search ? ' que coincidan con la búsqueda' : ' aún'}.
              </p>
            </div>
          ) : (
            filteredDelivered.map((vehicle) => (
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
                    {vehicle.brand} {vehicle.model}
                    {vehicle.owner?.name ? ` · ${vehicle.owner.name}` : ''}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground shrink-0">
                  {new Date(vehicle.updated_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </AppShell>
  );
}
