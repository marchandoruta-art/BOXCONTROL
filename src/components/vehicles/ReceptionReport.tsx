import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ClipboardList, Loader2, CheckCircle2, Fuel, Pen,
  Trash2, Save, ChevronDown, ChevronUp, Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/lib/types';

interface ReceptionReport {
  id: string;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  owner_dni: string | null;
  mileage: number | null;
  fuel_level: number;
  interior_checklist: Record<string, boolean>;
  client_belongings: string | null;
  exterior_damage_notes: string | null;
  reception_notes: string | null;
  client_signature: string | null;
  created_at: string;
}

const INTERIOR_ITEMS = [
  'Rueda de repuesto',
  'Gato',
  'Herramientas',
  'Triángulo de emergencia',
  'Chaleco reflectante',
  'Extintor',
  'Radio/Sistema audio',
  'Navegador GPS',
  'Alfombrillas',
  'Antena',
  'Documentación',
];

function FuelGauge({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const segments = [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const color = value <= 25 ? 'bg-[hsl(0_72%_60%)]' : value <= 50 ? 'bg-[hsl(35_92%_55%)]' : 'bg-[hsl(142_68%_48%)]';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> Nivel combustible</span>
        <span className="font-bold text-foreground">{value}%</span>
      </div>
      <div className="relative h-6 bg-muted rounded-full overflow-hidden border border-border/50">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${value}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-2">
          {['E', '¼', '½', '¾', 'F'].map((l) => (
            <span key={l} className="text-[9px] font-bold text-white/80 mix-blend-difference">{l}</span>
          ))}
        </div>
      </div>
      <input
        type="range" min={0} max={100} step={12.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5"
      />
    </div>
  );
}

function SignaturePad({
  value, onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(!!value);

  useEffect(() => {
    if (value && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.drawImage(img, 0, 0);
      };
      img.src = value;
      setHasSig(true);
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const src = 'touches' in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSig(true);
  };

  const stop = () => {
    drawing.current = false;
    const data = canvasRef.current?.toDataURL() ?? null;
    onChange(hasSig ? data : null);
  };

  const clear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSig(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1.5"><Pen className="h-3 w-3" /> Firma del cliente</Label>
        {hasSig && (
          <button onClick={clear} className="text-xs text-destructive hover:opacity-80 flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Borrar
          </button>
        )}
      </div>
      <div className="border border-border/50 rounded-lg overflow-hidden bg-muted/20">
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={start}
          onMouseMove={draw}
          onMouseUp={stop}
          onMouseLeave={stop}
          onTouchStart={start}
          onTouchMove={draw}
          onTouchEnd={stop}
        />
      </div>
      {!hasSig && (
        <p className="text-xs text-muted-foreground text-center">
          El cliente firma aquí con el ratón o el dedo
        </p>
      )}
    </div>
  );
}

export function ReceptionReport({ vehicle }: { vehicle: Vehicle }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [report, setReport] = useState<ReceptionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'vehiculo' | 'inspeccion' | 'firma'>('vehiculo');

  // Form state
  const [ownerName, setOwnerName] = useState(vehicle.owner?.name ?? '');
  const [ownerPhone, setOwnerPhone] = useState(vehicle.owner?.phone ?? '');
  const [ownerEmail, setOwnerEmail] = useState(vehicle.owner?.email ?? '');
  const [ownerDni, setOwnerDni] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState(50);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [belongings, setBelongings] = useState('');
  const [exteriorDamage, setExteriorDamage] = useState('');
  const [receptionNotes, setReceptionNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reception_reports')
      .select('*')
      .eq('vehicle_id', vehicle.id)
      .maybeSingle();

    if (data) {
      const r = data as unknown as ReceptionReport;
      setReport(r);
      setOwnerName(r.owner_name ?? vehicle.owner?.name ?? '');
      setOwnerPhone(r.owner_phone ?? vehicle.owner?.phone ?? '');
      setOwnerEmail(r.owner_email ?? vehicle.owner?.email ?? '');
      setOwnerDni(r.owner_dni ?? '');
      setMileage(r.mileage?.toString() ?? '');
      setFuelLevel(r.fuel_level ?? 50);
      setChecklist((r.interior_checklist as Record<string, boolean>) ?? {});
      setBelongings(r.client_belongings ?? '');
      setExteriorDamage(r.exterior_damage_notes ?? '');
      setReceptionNotes(r.reception_notes ?? '');
      setSignature(r.client_signature ?? null);
      setExpanded(true);
    }
    setLoading(false);
  }, [vehicle.id, vehicle.owner]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);

    const payload = {
      vehicle_id: vehicle.id,
      organization_id: organizationId,
      owner_name: ownerName || null,
      owner_phone: ownerPhone || null,
      owner_email: ownerEmail || null,
      owner_dni: ownerDni || null,
      mileage: mileage ? Number(mileage) : null,
      fuel_level: fuelLevel,
      interior_checklist: checklist,
      client_belongings: belongings || null,
      exterior_damage_notes: exteriorDamage || null,
      reception_notes: receptionNotes || null,
      client_signature: signature,
      created_by: user?.id,
    };

    const { error } = report
      ? await supabase.from('reception_reports').update(payload).eq('id', report.id)
      : await supabase.from('reception_reports').insert(payload);

    if (error) {
      toast.error('Error al guardar el informe: ' + error.message);
    } else {
      toast.success('Informe de recepción guardado');
      load();
    }
    setSaving(false);
  };

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>Informe Recepción - ${vehicle.plate}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{border:1px solid #ddd;padding:6px 10px;font-size:13px}th{background:#f5f5f5}img{max-width:300px;border:1px solid #ddd;margin-top:8px}.sig{border:1px solid #999;padding:4px}</style>
      </head><body>
      <h1>Informe de Recepción — ${vehicle.plate}</h1>
      <p><b>Fecha:</b> ${new Date().toLocaleDateString('es-ES')} &nbsp; <b>Vehículo:</b> ${vehicle.brand} ${vehicle.model} ${vehicle.year ?? ''} &nbsp; <b>Color:</b> ${vehicle.color ?? '—'}</p>
      <h3>Propietario</h3>
      <table><tr><th>Nombre</th><td>${ownerName}</td><th>Teléfono</th><td>${ownerPhone}</td></tr>
      <tr><th>Email</th><td>${ownerEmail}</td><th>DNI</th><td>${ownerDni}</td></tr></table>
      <h3>Estado del vehículo</h3>
      <table><tr><th>Kilómetros</th><td>${mileage || '—'}</td><th>Combustible</th><td>${fuelLevel}%</td></tr></table>
      <h3>Motivo de entrada</h3><p>${vehicle.client_description ?? '—'}</p>
      <h3>Daños exteriores</h3><p>${exteriorDamage || '—'}</p>
      <h3>Checklist interior</h3>
      <table>${INTERIOR_ITEMS.map((i) => `<tr><td>${i}</td><td>${checklist[i] ? '✓ Presente' : '✗ Ausente'}</td></tr>`).join('')}</table>
      <h3>Pertenencias del cliente</h3><p>${belongings || '—'}</p>
      <h3>Notas de recepción</h3><p>${receptionNotes || '—'}</p>
      ${signature ? `<h3>Firma del cliente</h3><div class="sig"><img src="${signature}" /></div>` : ''}
      <br/><p style="font-size:11px;color:#999">Generado por TallerControl · ${new Date().toLocaleString('es-ES')}</p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const toggleItem = (item: string) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const completedItems = INTERIOR_ITEMS.filter((i) => checklist[i]).length;

  return (
    <div className="border border-border/40 rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Informe de Recepción</span>
          {report && (
            <span className="text-xs bg-[hsl(142_68%_48%/0.15)] text-[hsl(142_68%_48%)] border border-[hsl(142_68%_48%/0.3)] px-2 py-0.5 rounded-full font-medium">
              Completado
            </span>
          )}
          {!report && !loading && (
            <span className="text-xs bg-[hsl(35_92%_55%/0.15)] text-[hsl(35_92%_55%)] border border-[hsl(35_92%_55%/0.3)] px-2 py-0.5 rounded-full font-medium">
              Pendiente
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={(e) => { e.stopPropagation(); printReport(); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded px-2 py-1 transition-colors"
            >
              <Printer className="h-3 w-3" /> Imprimir
            </button>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/40">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-border/40 bg-muted/20">
                {([['vehiculo', 'Vehículo y Cliente'], ['inspeccion', 'Inspección'], ['firma', 'Firma']] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={cn(
                      'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
                      tab === key
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-4 space-y-4">
                {/* Tab: Vehículo y Cliente */}
                {tab === 'vehiculo' && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre cliente</Label>
                        <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="h-8 text-sm bg-muted/30" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Teléfono</Label>
                        <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="h-8 text-sm bg-muted/30" type="tel" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="h-8 text-sm bg-muted/30" type="email" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">DNI / NIF</Label>
                        <Input value={ownerDni} onChange={(e) => setOwnerDni(e.target.value)} className="h-8 text-sm bg-muted/30" placeholder="12345678A" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Kilómetros al entrar</Label>
                        <Input value={mileage} onChange={(e) => setMileage(e.target.value)} className="h-8 text-sm bg-muted/30" type="number" placeholder="85000" />
                      </div>
                    </div>
                    <FuelGauge value={fuelLevel} onChange={setFuelLevel} />
                    <div className="space-y-1">
                      <Label className="text-xs">Daños exteriores visibles</Label>
                      <textarea
                        value={exteriorDamage}
                        onChange={(e) => setExteriorDamage(e.target.value)}
                        rows={3}
                        placeholder="Describe rasguños, golpes, daños visibles al recepcionar..."
                        className="w-full text-sm bg-muted/30 border border-border/50 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </>
                )}

                {/* Tab: Inspección */}
                {tab === 'inspeccion' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Checklist interior</Label>
                        <span className="text-xs text-muted-foreground">{completedItems}/{INTERIOR_ITEMS.length}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {INTERIOR_ITEMS.map((item) => (
                          <button
                            key={item}
                            onClick={() => toggleItem(item)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all text-left',
                              checklist[item]
                                ? 'bg-[hsl(142_68%_48%/0.1)] border-[hsl(142_68%_48%/0.3)] text-[hsl(142_68%_48%)]'
                                : 'bg-muted/20 border-border/40 text-muted-foreground hover:border-border'
                            )}
                          >
                            <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', checklist[item] ? 'opacity-100' : 'opacity-30')} />
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pertenencias del cliente en el vehículo</Label>
                      <textarea
                        value={belongings}
                        onChange={(e) => setBelongings(e.target.value)}
                        rows={2}
                        placeholder="Paraguas, gafas de sol, cargador, etc."
                        className="w-full text-sm bg-muted/30 border border-border/50 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Notas adicionales de recepción</Label>
                      <textarea
                        value={receptionNotes}
                        onChange={(e) => setReceptionNotes(e.target.value)}
                        rows={3}
                        placeholder="Observaciones del mecánico al recibir el vehículo..."
                        className="w-full text-sm bg-muted/30 border border-border/50 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </>
                )}

                {/* Tab: Firma */}
                {tab === 'firma' && (
                  <>
                    <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground border border-border/30">
                      El cliente confirma con su firma que los datos del vehículo son correctos
                      y que autoriza los trabajos descritos.
                    </div>
                    <SignaturePad value={signature} onChange={setSignature} />
                    {signature && (
                      <div className="flex items-center gap-2 text-xs text-[hsl(142_68%_48%)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Firma registrada
                      </div>
                    )}
                  </>
                )}

                {/* Save button */}
                <div className="flex gap-2 pt-2 border-t border-border/30">
                  {report && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={printReport}>
                      <Printer className="h-3.5 w-3.5" /> Imprimir informe
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 ml-auto">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {report ? 'Actualizar informe' : 'Guardar informe'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
