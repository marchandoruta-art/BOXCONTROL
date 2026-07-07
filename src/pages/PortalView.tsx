import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { type VehicleStatus, STATUS_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Loader2, Car, CheckCircle2, Phone, Mail,
  Wrench, Package, ChevronRight, ImageIcon, FileText,
} from 'lucide-react';

const STATUS_ORDER: VehicleStatus[] = [
  'recibido', 'presupuestar', 'presupuestado', 'en_reparacion',
  'pendiente_piezas', 'control_calidad', 'terminado', 'entregado',
];

const STATUS_PROGRESS: Record<VehicleStatus, number> = {
  recibido: 10, presupuestar: 25, presupuestado: 40,
  en_reparacion: 60, pendiente_piezas: 50,
  control_calidad: 80, terminado: 95, entregado: 100,
};

const STATUS_DESC: Record<VehicleStatus, string> = {
  recibido: 'Hemos recibido su vehículo y lo hemos registrado en el taller.',
  presupuestar: 'Nuestro equipo está revisando el vehículo para preparar el presupuesto.',
  presupuestado: 'El presupuesto está listo. Consulte los detalles más abajo.',
  en_reparacion: 'Su vehículo está siendo reparado por nuestros mecánicos.',
  pendiente_piezas: 'Los trabajos están pausados a la espera de una pieza necesaria.',
  control_calidad: 'La reparación ha terminado y estamos realizando el control de calidad final.',
  terminado: 'Su vehículo está listo para ser recogido. ¡Puede pasar a buscarlo!',
  entregado: 'Vehículo entregado. ¡Gracias por confiar en nosotros!',
};

const STATUS_COLOR: Record<VehicleStatus, string> = {
  recibido: 'text-[hsl(215_60%_62%)]',
  presupuestar: 'text-[hsl(35_92%_55%)]',
  presupuestado: 'text-[hsl(35_92%_55%)]',
  en_reparacion: 'text-[hsl(25_95%_55%)]',
  pendiente_piezas: 'text-[hsl(0_72%_60%)]',
  control_calidad: 'text-[hsl(280_65%_55%)]',
  terminado: 'text-[hsl(142_68%_48%)]',
  entregado: 'text-[hsl(142_68%_48%)]',
};

type WOStatus = 'borrador' | 'aprobado' | 'en_curso' | 'cerrado' | 'cancelado';

interface WorkOrderLine {
  type: 'labor' | 'part' | 'other';
  description: string;
  quantity: number;
  unit_price: number;
}

interface WorkOrder {
  id: string;
  number: number;
  status: WOStatus;
  iva_pct: number;
  discount_pct: number;
  notes: string | null;
  created_at: string;
  lines: WorkOrderLine[];
}

interface StatusHistory {
  status: VehicleStatus;
  changed_at: string;
}

interface Photo {
  id: string;
  storage_path: string;
  label: string | null;
}

interface PortalData {
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  status: VehicleStatus;
  client_description: string | null;
  organizationName: string;
  orgPhone: string | null;
  orgEmail: string | null;
  ownerName: string | null;
  statusHistory: StatusHistory[];
  workOrders: WorkOrder[];
  photos: Photo[];
}

function fmt(n: number) { return n.toFixed(2).replace('.', ',') + ' €'; }

function calcTotals(lines: WorkOrderLine[], iva: number, disc: number) {
  const subtotal = lines.reduce((a, l) => a + l.quantity * l.unit_price, 0);
  const discount = subtotal * (disc / 100);
  const base = subtotal - discount;
  const ivaAmt = base * (iva / 100);
  return { subtotal, discount, base, ivaAmt, total: base + ivaAmt };
}

export default function PortalView() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [token]);

  const load = async () => {
    setLoading(true);

    const { data: tokenRow } = await supabase
      .from('client_portal_tokens')
      .select('vehicle_id, revoked, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (!tokenRow || tokenRow.revoked || new Date(tokenRow.expires_at) < new Date()) {
      setError('Este enlace no es válido o ha caducado. Contacta con el taller para obtener uno nuevo.');
      setLoading(false);
      return;
    }

    const vid = tokenRow.vehicle_id;

    const [
      { data: vehicle },
      { data: history },
      { data: wos },
      { data: photos },
    ] = await Promise.all([
      supabase
        .from('vehicles')
        .select('plate, brand, model, year, color, status, client_description, owner:owners(name), organizations(name, phone, email)')
        .eq('id', vid)
        .maybeSingle(),
      supabase
        .from('vehicle_status_history')
        .select('status, changed_at')
        .eq('vehicle_id', vid)
        .order('changed_at', { ascending: true }),
      supabase
        .from('work_orders')
        .select('id, number, status, iva_pct, discount_pct, notes, created_at')
        .eq('vehicle_id', vid)
        .not('status', 'eq', 'cancelado')
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicle_photos')
        .select('id, storage_path, label')
        .eq('vehicle_id', vid)
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    if (!vehicle) {
      setError('No se pudo cargar la información del vehículo.');
      setLoading(false);
      return;
    }

    // Load work order lines
    let workOrders: WorkOrder[] = [];
    if (wos && wos.length > 0) {
      const { data: lines } = await supabase
        .from('work_order_lines')
        .select('*')
        .in('work_order_id', wos.map((w) => w.id))
        .order('sort_order');

      workOrders = wos.map((wo) => ({
        ...wo,
        lines: (lines ?? []).filter((l: any) => l.work_order_id === wo.id) as WorkOrderLine[],
      }));
    }

    // Get photo public URLs
    if (photos && photos.length > 0) {
      const urls: Record<string, string> = {};
      for (const p of photos) {
        const { data: u } = supabase.storage.from('vehicle-photos').getPublicUrl(p.storage_path);
        urls[p.id] = u.publicUrl;
      }
      setPhotoUrls(urls);
    }

    const v = vehicle as any;
    setData({
      plate: v.plate,
      brand: v.brand,
      model: v.model,
      year: v.year ?? null,
      color: v.color ?? null,
      status: v.status as VehicleStatus,
      client_description: v.client_description ?? null,
      organizationName: v.organizations?.name ?? 'Taller',
      orgPhone: v.organizations?.phone ?? null,
      orgEmail: v.organizations?.email ?? null,
      ownerName: v.owner?.name ?? null,
      statusHistory: (history ?? []) as StatusHistory[],
      workOrders,
      photos: (photos ?? []) as Photo[],
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(220_13%_6%)] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[hsl(220_13%_6%)] flex items-center justify-center px-4">
        <div className="text-center space-y-2 max-w-xs">
          <div className="text-4xl">🔗</div>
          <p className="text-white font-medium">Enlace no válido</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  const pct = STATUS_PROGRESS[data.status] ?? 0;

  return (
    <div className="min-h-screen bg-[hsl(220_13%_6%)] text-white">
      {/* Header taller */}
      <div className="bg-[hsl(220_13%_10%)] border-b border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Portal del cliente</p>
            <h1 className="font-bold text-lg">{data.organizationName}</h1>
          </div>
          <Wrench className="h-6 w-6 text-primary opacity-60" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Vehículo + estado actual */}
        <div className="bg-[hsl(220_13%_12%)] rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
            <div className="bg-primary/15 p-2.5 rounded-xl">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xl tracking-wider">{data.plate}</span>
                {data.color && (
                  <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{data.color}</span>
                )}
              </div>
              <p className="text-sm text-gray-400">{data.brand} {data.model}{data.year ? ` · ${data.year}` : ''}</p>
            </div>
          </div>

          {/* Estado actual destacado */}
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Estado actual</span>
              <span className={cn('font-bold text-sm', STATUS_COLOR[data.status])}>
                {STATUS_LABELS[data.status]}
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Recibido</span><span>En reparación</span><span>Entregado</span>
            </div>

            {/* Descripción del estado */}
            <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <p className="text-sm text-gray-200 leading-relaxed">{STATUS_DESC[data.status]}</p>
            </div>

            {data.client_description && (
              <div className="pt-1">
                <p className="text-xs text-gray-500 mb-1">Motivo de entrada</p>
                <p className="text-sm text-gray-300">{data.client_description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Línea de tiempo */}
        {data.statusHistory.length > 0 && (
          <div className="bg-[hsl(220_13%_12%)] rounded-2xl border border-white/10 p-4 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wide font-medium">Historial de estados</h3>
            <div className="space-y-0">
              {data.statusHistory.map((h, i) => {
                const isLast = i === data.statusHistory.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                        isLast
                          ? 'border-primary bg-primary/20'
                          : 'border-white/20 bg-white/5'
                      )}>
                        {isLast
                          ? <div className="w-2 h-2 rounded-full bg-primary" />
                          : <CheckCircle2 className="w-3 h-3 text-white/40" />
                        }
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-white/10 my-1" />}
                    </div>
                    <div className={cn('pb-3', isLast ? 'pb-0' : '')}>
                      <p className={cn('text-sm font-medium', isLast ? 'text-white' : 'text-gray-400')}>
                        {STATUS_LABELS[h.status as VehicleStatus]}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(h.changed_at).toLocaleDateString('es-ES', {
                          day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Presupuestos */}
        {data.workOrders.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wide font-medium px-1">Presupuestos</h3>
            {data.workOrders.map((wo) => {
              const { total, base, ivaAmt, discount } = calcTotals(wo.lines, wo.iva_pct, wo.discount_pct);
              const statusColor = wo.status === 'cerrado' ? 'text-[hsl(142_68%_48%)]'
                : wo.status === 'aprobado' ? 'text-[hsl(142_68%_48%)]'
                : wo.status === 'en_curso' ? 'text-[hsl(35_92%_55%)]'
                : 'text-gray-400';
              const statusLabel = { borrador: 'Borrador', aprobado: 'Aprobado', en_curso: 'En curso', cerrado: 'Completado', cancelado: 'Cancelado' }[wo.status];

              return (
                <div key={wo.id} className="bg-[hsl(220_13%_12%)] rounded-2xl border border-white/10 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Presupuesto #{wo.number}</span>
                    </div>
                    <span className={cn('text-xs font-medium', statusColor)}>{statusLabel}</span>
                  </div>

                  {/* Lines */}
                  <div className="px-4 py-3 space-y-2">
                    {wo.lines.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 shrink-0">
                          {l.type === 'labor' ? <Wrench className="h-3 w-3" /> : <Package className="h-3 w-3" />}
                        </span>
                        <span className="flex-1 text-gray-300">{l.description}</span>
                        <span className="text-gray-400 text-xs shrink-0">{l.quantity} × {fmt(l.unit_price)}</span>
                        <span className="font-medium shrink-0">{fmt(l.quantity * l.unit_price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="bg-white/5 px-4 py-3 space-y-1 border-t border-white/10">
                    {wo.discount_pct > 0 && (
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Descuento ({wo.discount_pct}%)</span><span>-{fmt(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Base imponible</span><span>{fmt(base)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>IVA ({wo.iva_pct}%)</span><span>{fmt(ivaAmt)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-1 border-t border-white/10 mt-1">
                      <span>Total</span><span className="text-primary">{fmt(total)}</span>
                    </div>
                  </div>

                  {wo.notes && (
                    <div className="px-4 py-2 border-t border-white/10">
                      <p className="text-xs text-gray-400">{wo.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fotos */}
        {data.photos.length > 0 && (
          <div className="bg-[hsl(220_13%_12%)] rounded-2xl border border-white/10 p-4 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wide font-medium flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5" /> Fotos del vehículo
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {data.photos.map((p) => (
                <a key={p.id} href={photoUrls[p.id]} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photoUrls[p.id]}
                    alt={p.label ?? 'foto'}
                    className="w-full aspect-square object-cover rounded-xl border border-white/10 hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contacto con el taller */}
        {(data.orgPhone || data.orgEmail) && (
          <div className="bg-[hsl(220_13%_12%)] rounded-2xl border border-white/10 p-4 space-y-3">
            <h3 className="text-xs text-gray-400 uppercase tracking-wide font-medium">¿Tienes alguna pregunta?</h3>
            <p className="text-sm text-gray-300">Contacta directamente con {data.organizationName}:</p>
            <div className="space-y-2">
              {data.orgPhone && (
                <a
                  href={`tel:${data.orgPhone}`}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl px-4 py-3"
                >
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{data.orgPhone}</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </a>
              )}
              {data.orgEmail && (
                <a
                  href={`mailto:${data.orgEmail}`}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl px-4 py-3"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm">{data.orgEmail}</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 pb-4">
          Powered by BoxControl · {data.organizationName}
        </p>
      </div>
    </div>
  );
}
