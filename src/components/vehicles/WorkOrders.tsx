import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  FileText, Plus, Loader2, Trash2, Printer,
  ChevronDown, ChevronUp, Wrench, Package, MoreHorizontal,
  CheckCircle2, XCircle, PlayCircle, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/lib/types';

type WOStatus = 'borrador' | 'aprobado' | 'en_curso' | 'cerrado' | 'cancelado';
type LineType = 'labor' | 'part' | 'other';

interface WorkOrderLine {
  id?: string;
  type: LineType;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

interface WorkOrder {
  id: string;
  number: number;
  status: WOStatus;
  notes: string | null;
  iva_pct: number;
  discount_pct: number;
  created_at: string;
  approved_at: string | null;
  closed_at: string | null;
  lines?: WorkOrderLine[];
}

const STATUS_LABEL: Record<WOStatus, string> = {
  borrador: 'Borrador',
  aprobado: 'Aprobado',
  en_curso: 'En curso',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<WOStatus, string> = {
  borrador: 'text-muted-foreground bg-muted/40 border-border/40',
  aprobado: 'text-[hsl(142_68%_48%)] bg-[hsl(142_68%_48%/0.1)] border-[hsl(142_68%_48%/0.3)]',
  en_curso: 'text-[hsl(35_92%_55%)] bg-[hsl(35_92%_55%/0.1)] border-[hsl(35_92%_55%/0.3)]',
  cerrado: 'text-[hsl(215_60%_62%)] bg-[hsl(215_60%_62%/0.1)] border-[hsl(215_60%_62%/0.3)]',
  cancelado: 'text-[hsl(0_72%_60%)] bg-[hsl(0_72%_60%/0.1)] border-[hsl(0_72%_60%/0.3)]',
};

const TYPE_ICON: Record<LineType, React.ReactNode> = {
  labor: <Wrench className="h-3 w-3" />,
  part: <Package className="h-3 w-3" />,
  other: <MoreHorizontal className="h-3 w-3" />,
};

const TYPE_LABEL: Record<LineType, string> = {
  labor: 'Mano de obra',
  part: 'Pieza',
  other: 'Otro',
};

function calcTotals(lines: WorkOrderLine[], ivaPct: number, discountPct: number) {
  const subtotal = lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0);
  const discount = subtotal * (discountPct / 100);
  const base = subtotal - discount;
  const iva = base * (ivaPct / 100);
  const total = base + iva;
  return { subtotal, discount, base, iva, total };
}

function printWorkOrder(wo: WorkOrder, vehicle: Vehicle, orgName: string) {
  const lines = wo.lines ?? [];
  const { subtotal, discount, base, iva, total } = calcTotals(lines, wo.iva_pct, wo.discount_pct);
  const fmt = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`
    <html><head><title>Presupuesto #${wo.number} — ${vehicle.plate}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#111;max-width:700px;margin:0 auto}
      h1{font-size:22px;margin:0}h2{font-size:14px;font-weight:normal;color:#555;margin:4px 0 0}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;border:1px solid #ddd;background:#f9f9f9}
      table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
      th{background:#f3f3f3;text-align:left;padding:7px 10px;border-bottom:2px solid #ddd}
      td{padding:7px 10px;border-bottom:1px solid #eee}
      .right{text-align:right}.totals{margin-top:16px;text-align:right;font-size:13px}
      .totals td{padding:3px 8px;border:none}.total-row{font-size:16px;font-weight:bold}
      .footer{margin-top:40px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
      .info{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;font-size:13px}
      .info div{background:#f9f9f9;padding:10px 14px;border-radius:6px}
      .info label{font-size:11px;color:#888;display:block;margin-bottom:2px}
    </style>
    </head><body>
    <div class="header">
      <div>
        <h1>${orgName}</h1>
        <h2>Presupuesto / Orden de trabajo</h2>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:bold">#${wo.number}</div>
        <div class="badge">${STATUS_LABEL[wo.status]}</div>
        <div style="font-size:11px;color:#888;margin-top:4px">${new Date(wo.created_at).toLocaleDateString('es-ES')}</div>
      </div>
    </div>
    <div class="info">
      <div>
        <label>Vehículo</label>
        <strong>${vehicle.plate}</strong> — ${vehicle.brand} ${vehicle.model} ${vehicle.year ?? ''}
        ${vehicle.color ? `<br/><span style="color:#888">${vehicle.color}</span>` : ''}
      </div>
      <div>
        <label>Cliente</label>
        <strong>${vehicle.owner?.name ?? '—'}</strong>
        ${vehicle.owner?.phone ? `<br/>${vehicle.owner.phone}` : ''}
        ${vehicle.owner?.email ? `<br/>${vehicle.owner.email}` : ''}
      </div>
    </div>
    ${vehicle.client_description ? `<div style="margin-bottom:16px;font-size:13px"><strong>Motivo:</strong> ${vehicle.client_description}</div>` : ''}
    <table>
      <thead><tr>
        <th>Tipo</th><th>Descripción</th>
        <th class="right">Cant.</th><th class="right">Precio unit.</th><th class="right">Total</th>
      </tr></thead>
      <tbody>
        ${lines.map((l) => `<tr>
          <td>${TYPE_LABEL[l.type]}</td>
          <td>${l.description}</td>
          <td class="right">${l.quantity}</td>
          <td class="right">${fmt(l.unit_price)}</td>
          <td class="right">${fmt(l.quantity * l.unit_price)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="totals"><table style="margin-left:auto;min-width:220px">
      <tr><td>Subtotal</td><td class="right">${fmt(subtotal)}</td></tr>
      ${wo.discount_pct > 0 ? `<tr><td>Descuento (${wo.discount_pct}%)</td><td class="right">-${fmt(discount)}</td></tr>` : ''}
      <tr><td>Base imponible</td><td class="right">${fmt(base)}</td></tr>
      <tr><td>IVA (${wo.iva_pct}%)</td><td class="right">${fmt(iva)}</td></tr>
      <tr class="total-row"><td><strong>TOTAL</strong></td><td class="right"><strong>${fmt(total)}</strong></td></tr>
    </table></div>
    ${wo.notes ? `<div style="margin-top:20px;font-size:13px;background:#f9f9f9;padding:12px;border-radius:6px"><strong>Notas:</strong> ${wo.notes}</div>` : ''}
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;font-size:12px">
      <div style="border-top:1px solid #999;padding-top:8px;color:#555">Firma del taller</div>
      <div style="border-top:1px solid #999;padding-top:8px;color:#555">Firma del cliente / Conforme</div>
    </div>
    <div class="footer">Generado por BoxControl · ${new Date().toLocaleString('es-ES')}</div>
    </body></html>
  `);
  w.document.close();
  w.print();
}

function WorkOrderEditor({
  vehicleId,
  organizationId,
  userId,
  existing,
  onSaved,
  onCancel,
}: {
  vehicleId: string;
  organizationId: string;
  userId: string;
  existing?: WorkOrder;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [lines, setLines] = useState<WorkOrderLine[]>(
    existing?.lines ?? [{ type: 'labor', description: '', quantity: 1, unit_price: 0, sort_order: 0 }]
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [ivaPct, setIvaPct] = useState(existing?.iva_pct ?? 21);
  const [discountPct, setDiscountPct] = useState(existing?.discount_pct ?? 0);
  const [saving, setSaving] = useState(false);

  const addLine = (type: LineType) => {
    setLines((prev) => [...prev, { type, description: '', quantity: 1, unit_price: 0, sort_order: prev.length }]);
  };

  const updateLine = (idx: number, field: keyof WorkOrderLine, value: string | number) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const { subtotal, discount, base, iva, total } = calcTotals(lines, ivaPct, discountPct);
  const fmt = (n: number) => n.toFixed(2) + ' €';

  const handleSave = async () => {
    if (lines.length === 0) { toast.error('Añade al menos una línea'); return; }
    setSaving(true);

    if (existing) {
      // Update
      const { error } = await supabase.from('work_orders').update({
        notes: notes || null,
        iva_pct: ivaPct,
        discount_pct: discountPct,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) { toast.error('Error: ' + error.message); setSaving(false); return; }

      await supabase.from('work_order_lines').delete().eq('work_order_id', existing.id);
      await supabase.from('work_order_lines').insert(
        lines.map((l, i) => ({ ...l, work_order_id: existing.id, sort_order: i, id: undefined }))
      );
    } else {
      // Insert
      const { data: wo, error } = await supabase.from('work_orders').insert({
        vehicle_id: vehicleId,
        organization_id: organizationId,
        created_by: userId,
        notes: notes || null,
        iva_pct: ivaPct,
        discount_pct: discountPct,
      }).select().single();
      if (error || !wo) { toast.error('Error: ' + (error?.message ?? '')); setSaving(false); return; }

      await supabase.from('work_order_lines').insert(
        lines.map((l, i) => ({ ...l, work_order_id: wo.id, sort_order: i, id: undefined }))
      );
    }

    toast.success(existing ? 'Presupuesto actualizado' : 'Presupuesto creado');
    onSaved();
    setSaving(false);
  };

  return (
    <div className="space-y-4 p-4 border border-border/40 rounded-xl bg-card">
      <h4 className="text-sm font-semibold">{existing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h4>

      {/* Lines */}
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-[auto_1fr_80px_90px_auto] gap-1.5 items-center">
            <select
              value={line.type}
              onChange={(e) => updateLine(idx, 'type', e.target.value)}
              className="text-xs bg-muted/30 border border-border/50 rounded px-1.5 py-1.5 h-8 text-foreground"
            >
              {(['labor', 'part', 'other'] as LineType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
            <Input
              value={line.description}
              onChange={(e) => updateLine(idx, 'description', e.target.value)}
              placeholder="Descripción..."
              className="h-8 text-sm bg-muted/30"
            />
            <Input
              value={line.quantity}
              onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
              type="number"
              min={0}
              step={0.5}
              className="h-8 text-sm bg-muted/30 text-right"
            />
            <Input
              value={line.unit_price}
              onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
              type="number"
              min={0}
              step={0.01}
              placeholder="0,00"
              className="h-8 text-sm bg-muted/30 text-right"
            />
            <button onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Column headers hint */}
        {lines.length > 0 && (
          <div className="grid grid-cols-[auto_1fr_80px_90px_auto] gap-1.5 px-0.5">
            <span />
            <span className="text-[10px] text-muted-foreground">Descripción</span>
            <span className="text-[10px] text-muted-foreground text-right">Cant.</span>
            <span className="text-[10px] text-muted-foreground text-right">€/ud.</span>
            <span />
          </div>
        )}

        {/* Add line buttons */}
        <div className="flex gap-2 flex-wrap">
          {(['labor', 'part', 'other'] as LineType[]).map((t) => (
            <button
              key={t}
              onClick={() => addLine(t)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/40 hover:border-border rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Plus className="h-3 w-3" /> {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      {/* IVA + descuento */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">IVA (%)</Label>
          <Input
            value={ivaPct}
            onChange={(e) => setIvaPct(parseFloat(e.target.value) || 0)}
            type="number" min={0} max={100} step={1}
            className="h-8 text-sm bg-muted/30"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descuento (%)</Label>
          <Input
            value={discountPct}
            onChange={(e) => setDiscountPct(parseFloat(e.target.value) || 0)}
            type="number" min={0} max={100} step={1}
            className="h-8 text-sm bg-muted/30"
          />
        </div>
      </div>

      {/* Totals preview */}
      <div className="bg-muted/20 rounded-lg p-3 space-y-1 text-sm border border-border/30">
        {discountPct > 0 && (
          <>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Descuento ({discountPct}%)</span><span>-{fmt(discount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>Base imponible</span><span>{fmt(base)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>IVA ({ivaPct}%)</span><span>{fmt(iva)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t border-border/40 pt-1 mt-1">
          <span>Total</span><span>{fmt(total)}</span>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs">Notas internas</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Observaciones, condiciones, garantía..."
          className="w-full text-sm bg-muted/30 border border-border/50 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar presupuesto'}
        </Button>
      </div>
    </div>
  );
}

export function WorkOrders({ vehicle, orgName }: { vehicle: Vehicle; orgName: string }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: wos } = await supabase
      .from('work_orders')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .order('created_at', { ascending: false });

    if (wos && wos.length > 0) {
      const ids = wos.map((w) => w.id);
      const { data: lines } = await supabase
        .from('work_order_lines')
        .select('*')
        .in('work_order_id', ids)
        .order('sort_order');

      const withLines = (wos as WorkOrder[]).map((wo) => ({
        ...wo,
        lines: (lines ?? []).filter((l: WorkOrderLine & { work_order_id: string }) => l.work_order_id === wo.id) as WorkOrderLine[],
      }));
      setOrders(withLines);
    } else {
      setOrders([]);
    }
    setLoading(false);
  }, [vehicle.id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (wo: WorkOrder, newStatus: WOStatus) => {
    const patch: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'aprobado') patch.approved_at = new Date().toISOString();
    if (newStatus === 'cerrado') patch.closed_at = new Date().toISOString();
    const { error } = await supabase.from('work_orders').update(patch).eq('id', wo.id);
    if (error) toast.error('Error al actualizar estado');
    else { toast.success(`Estado → ${STATUS_LABEL[newStatus]}`); load(); }
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Eliminado'); load(); }
  };

  const totalOrders = orders.length;
  const openOrders = orders.filter((o) => !['cerrado', 'cancelado'].includes(o.status)).length;

  return (
    <div className="border border-border/40 rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Presupuestos / Órdenes de trabajo</span>
          {totalOrders > 0 && (
            <span className="text-xs bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-medium">
              {openOrders > 0 ? `${openOrders} abierto${openOrders !== 1 ? 's' : ''}` : `${totalOrders} total`}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40 p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Existing orders */}
              {orders.map((wo) => {
                const isOpen = openId === wo.id;
                const { total } = calcTotals(wo.lines ?? [], wo.iva_pct, wo.discount_pct);
                return (
                  <div key={wo.id} className="border border-border/30 rounded-xl overflow-hidden">
                    {/* Order header */}
                    <button
                      onClick={() => setOpenId(isOpen ? null : wo.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20 transition-colors text-left"
                    >
                      <span className="text-xs text-muted-foreground font-mono">#{wo.number}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLOR[wo.status])}>
                        {STATUS_LABEL[wo.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(wo.created_at).toLocaleDateString('es-ES')}
                      </span>
                      <span className="ml-auto font-semibold text-sm">{total.toFixed(2)} €</span>
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>

                    {isOpen && (
                      <div className="border-t border-border/30 p-3 space-y-3">
                        {/* Lines table */}
                        {(wo.lines ?? []).length > 0 && (
                          <div className="rounded-lg overflow-hidden border border-border/30">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-muted/30 text-muted-foreground">
                                  <th className="text-left px-2 py-1.5">Tipo</th>
                                  <th className="text-left px-2 py-1.5">Descripción</th>
                                  <th className="text-right px-2 py-1.5">Cant.</th>
                                  <th className="text-right px-2 py-1.5">€/ud.</th>
                                  <th className="text-right px-2 py-1.5">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(wo.lines ?? []).map((l, i) => (
                                  <tr key={i} className="border-t border-border/20">
                                    <td className="px-2 py-1.5 flex items-center gap-1 text-muted-foreground">
                                      {TYPE_ICON[l.type]}
                                    </td>
                                    <td className="px-2 py-1.5">{l.description}</td>
                                    <td className="px-2 py-1.5 text-right">{l.quantity}</td>
                                    <td className="px-2 py-1.5 text-right">{l.unit_price.toFixed(2)} €</td>
                                    <td className="px-2 py-1.5 text-right font-medium">{(l.quantity * l.unit_price).toFixed(2)} €</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Totals mini */}
                        <div className="text-xs text-right space-y-0.5 text-muted-foreground">
                          {wo.discount_pct > 0 && <div>Descuento ({wo.discount_pct}%): -{calcTotals(wo.lines ?? [], wo.iva_pct, wo.discount_pct).discount.toFixed(2)} €</div>}
                          <div>IVA ({wo.iva_pct}%): {calcTotals(wo.lines ?? [], wo.iva_pct, wo.discount_pct).iva.toFixed(2)} €</div>
                          <div className="text-base font-bold text-foreground">Total: {total.toFixed(2)} €</div>
                        </div>

                        {wo.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/20 rounded p-2">{wo.notes}</p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1 border-t border-border/30">
                          {/* Status transitions */}
                          {wo.status === 'borrador' && (
                            <button
                              onClick={() => updateStatus(wo, 'aprobado')}
                              className="flex items-center gap-1 text-xs text-[hsl(142_68%_48%)] hover:opacity-80 border border-[hsl(142_68%_48%/0.3)] rounded px-2 py-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Aprobar
                            </button>
                          )}
                          {wo.status === 'aprobado' && (
                            <button
                              onClick={() => updateStatus(wo, 'en_curso')}
                              className="flex items-center gap-1 text-xs text-[hsl(35_92%_55%)] hover:opacity-80 border border-[hsl(35_92%_55%/0.3)] rounded px-2 py-1"
                            >
                              <PlayCircle className="h-3 w-3" /> Iniciar trabajos
                            </button>
                          )}
                          {wo.status === 'en_curso' && (
                            <button
                              onClick={() => updateStatus(wo, 'cerrado')}
                              className="flex items-center gap-1 text-xs text-[hsl(215_60%_62%)] hover:opacity-80 border border-[hsl(215_60%_62%/0.3)] rounded px-2 py-1"
                            >
                              <Lock className="h-3 w-3" /> Cerrar
                            </button>
                          )}
                          {!['cerrado', 'cancelado'].includes(wo.status) && (
                            <button
                              onClick={() => updateStatus(wo, 'cancelado')}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive border border-border/30 rounded px-2 py-1"
                            >
                              <XCircle className="h-3 w-3" /> Cancelar
                            </button>
                          )}

                          <button
                            onClick={() => printWorkOrder(wo, vehicle, orgName)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/30 rounded px-2 py-1 ml-auto"
                          >
                            <Printer className="h-3 w-3" /> Imprimir
                          </button>

                          {wo.status === 'borrador' && (
                            <button
                              onClick={() => { setEditing(wo); setCreating(false); }}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/30 rounded px-2 py-1"
                            >
                              Editar
                            </button>
                          )}

                          {wo.status === 'borrador' && (
                            <button
                              onClick={() => deleteOrder(wo.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive border border-border/30 rounded px-2 py-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Editor */}
              {(creating || editing) && organizationId && user && (
                <WorkOrderEditor
                  vehicleId={vehicle.id}
                  organizationId={organizationId}
                  userId={user.id}
                  existing={editing ?? undefined}
                  onSaved={() => { setCreating(false); setEditing(null); load(); }}
                  onCancel={() => { setCreating(false); setEditing(null); }}
                />
              )}

              {/* New order button */}
              {!creating && !editing && (
                <button
                  onClick={() => { setCreating(true); setEditing(null); }}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/40 hover:border-border rounded-lg px-3 py-2 w-full justify-center transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuevo presupuesto
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
