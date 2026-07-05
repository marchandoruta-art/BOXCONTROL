import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, Loader2, CheckCircle2, XCircle, Gauge } from 'lucide-react';
import { toast } from 'sonner';
import { type QualityChecklistItem, DEFAULT_QUALITY_CHECKLIST } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QualityCheckDialogProps {
  vehicleId: string;
  vehiclePlate: string;
  vehicleStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QualityCheckDialog({
  vehicleId,
  vehiclePlate,
  vehicleStatus,
  open,
  onOpenChange,
  onSuccess,
}: QualityCheckDialogProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<QualityChecklistItem[]>(
    DEFAULT_QUALITY_CHECKLIST.map((item) => ({ item, passed: true, notes: '' }))
  );
  const [roadTestCompleted, setRoadTestCompleted] = useState(false);
  const [roadTestKm, setRoadTestKm] = useState('');
  const [roadTestNotes, setRoadTestNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    loadExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicleId]);

  const loadExisting = async () => {
    setFetching(true);
    const { data } = await supabase
      .from('vehicle_quality_checks')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCheckId(data.id);
      const existing = (data.checklist as unknown as QualityChecklistItem[]) || [];
      setChecklist(existing.length > 0 ? existing : DEFAULT_QUALITY_CHECKLIST.map((item) => ({ item, passed: true, notes: '' })));
      setRoadTestCompleted(data.road_test_completed || false);
      setRoadTestKm(data.road_test_km?.toString() || '');
      setRoadTestNotes(data.road_test_notes || '');
    } else {
      setCheckId(null);
      setChecklist(DEFAULT_QUALITY_CHECKLIST.map((item) => ({ item, passed: true, notes: '' })));
      setRoadTestCompleted(false);
      setRoadTestKm('');
      setRoadTestNotes('');
    }
    setFetching(false);
  };

  const toggleItem = (index: number) => {
    setChecklist((prev) => prev.map((it, i) => (i === index ? { ...it, passed: !it.passed } : it)));
  };

  const updateItemNotes = (index: number, notes: string) => {
    setChecklist((prev) => prev.map((it, i) => (i === index ? { ...it, notes } : it)));
  };

  const allPassed = checklist.every((it) => it.passed);
  const readyToDeliver = allPassed && roadTestCompleted;
  const failedItems = checklist.filter((it) => !it.passed);

  const handleSave = async (markAsFinished: boolean) => {
    if (!organizationId || !user) return;
    setLoading(true);

    const payload = {
      vehicle_id: vehicleId,
      organization_id: organizationId,
      checklist: checklist as any,
      road_test_completed: roadTestCompleted,
      road_test_km: roadTestKm ? Number(roadTestKm) : null,
      road_test_notes: roadTestNotes || null,
      passed: readyToDeliver,
      checked_by: user.id,
      checked_at: new Date().toISOString(),
    };

    const { error } = checkId
      ? await supabase.from('vehicle_quality_checks').update(payload).eq('id', checkId)
      : await supabase.from('vehicle_quality_checks').insert(payload);

    if (error) {
      toast.error('Error al guardar el control de calidad');
      setLoading(false);
      return;
    }

    if (markAsFinished && readyToDeliver && vehicleStatus === 'control_calidad') {
      const { error: statusError } = await supabase.from('vehicles').update({ status: 'terminado' }).eq('id', vehicleId);
      if (statusError) {
        toast.error('Control guardado, pero no se pudo marcar como Terminado');
      } else {
        toast.success(`${vehiclePlate} superó el control de calidad → Terminado`);
      }
    } else if (markAsFinished && !readyToDeliver) {
      toast.warning(`Quedan ${failedItems.length} punto(s) pendientes antes de poder entregar el vehículo`);
    } else {
      toast.success('Control de calidad guardado');
    }

    setLoading(false);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-status-quality" />
            Control de Calidad · {vehiclePlate}
          </DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-3 max-h-[55vh]">
            <div className="space-y-5 pb-2">
              <div>
                <p className="text-sm font-medium mb-2">Checklist mecánico</p>
                <div className="space-y-2">
                  {checklist.map((it, index) => (
                    <div key={it.item} className="rounded-md border p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm">{it.item}</span>
                        <button
                          type="button"
                          onClick={() => toggleItem(index)}
                          className={cn(
                            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors',
                            it.passed ? 'bg-status-completed/15 text-status-completed' : 'bg-status-pending-parts/15 text-status-pending-parts'
                          )}
                        >
                          {it.passed ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" /> OK
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" /> Revisar
                            </>
                          )}
                        </button>
                      </div>
                      {!it.passed && (
                        <Input
                          placeholder="¿Qué hay que revisar?"
                          value={it.notes || ''}
                          onChange={(e) => updateItemNotes(index, e.target.value)}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="road-test" className="flex items-center gap-2 text-sm font-medium">
                    <Gauge className="h-4 w-4" /> Prueba de carretera realizada
                  </Label>
                  <Switch id="road-test" checked={roadTestCompleted} onCheckedChange={setRoadTestCompleted} />
                </div>
                {roadTestCompleted && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Km recorridos (aprox.)</Label>
                      <Input type="number" value={roadTestKm} onChange={(e) => setRoadTestKm(e.target.value)} placeholder="10" className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Observaciones de la prueba</Label>
                      <Textarea
                        value={roadTestNotes}
                        onChange={(e) => setRoadTestNotes(e.target.value)}
                        placeholder="Comportamiento en carretera, ruidos, vibraciones..."
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  </>
                )}
              </div>

              <div
                className={cn(
                  'rounded-md p-3 text-sm font-medium flex items-center gap-2',
                  readyToDeliver ? 'bg-status-completed/10 text-status-completed' : 'bg-status-pending-parts/10 text-status-pending-parts'
                )}
              >
                {readyToDeliver ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Apto para pasar a Terminado
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    {!roadTestCompleted ? 'Falta completar la prueba de carretera' : `${failedItems.length} punto(s) del checklist sin superar`}
                  </>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={loading || fetching}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar borrador'}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={loading || fetching}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar y marcar Terminado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
