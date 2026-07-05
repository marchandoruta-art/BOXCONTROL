import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Part {
  id: string;
  name: string;
  quantity: number;
  status: string;
}

const STATUS_CYCLE: Record<string, string> = {
  pendiente: 'pedido',
  pedido: 'recibido',
  recibido: 'pendiente',
};

const STATUS_STYLE: Record<string, string> = {
  pendiente: 'bg-status-pending-parts/15 text-status-pending-parts',
  pedido: 'bg-status-to-quote/15 text-status-to-quote',
  recibido: 'bg-status-completed/15 text-status-completed',
};

export function PartsList({ vehicleId }: { vehicleId: string }) {
  const { organizationId } = useOrganization();
  const [parts, setParts] = useState<Part[]>([]);
  const [newPart, setNewPart] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('parts').select('*').eq('vehicle_id', vehicleId).order('created_at');
    setParts((data as unknown as Part[]) || []);
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  const addPart = async () => {
    if (!newPart.trim() || !organizationId) return;
    const { error } = await supabase.from('parts').insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      name: newPart.trim(),
    });
    if (error) {
      toast.error('Error al añadir la pieza');
      return;
    }
    setNewPart('');
    load();
  };

  const cycleStatus = async (part: Part) => {
    const next = STATUS_CYCLE[part.status] ?? 'pendiente';
    await supabase.from('parts').update({ status: next }).eq('id', part.id);
    load();
  };

  const deletePart = async (id: string) => {
    await supabase.from('parts').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium flex items-center gap-1.5">
        <Package className="h-4 w-4" /> Piezas / recambios
      </p>
      <div className="flex gap-2">
        <Input
          value={newPart}
          onChange={(e) => setNewPart(e.target.value)}
          placeholder="Ej. Pastillas de freno delanteras"
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && addPart()}
        />
        <Button size="sm" onClick={addPart} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {parts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin piezas registradas.</p>
      ) : (
        <div className="space-y-1.5">
          {parts.map((part) => (
            <div key={part.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
              <span className="flex-1">{part.name}</span>
              <button
                onClick={() => cycleStatus(part)}
                className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', STATUS_STYLE[part.status])}
              >
                {part.status === 'recibido' && <Check className="h-3 w-3" />}
                {part.status}
              </button>
              <button onClick={() => deletePart(part.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
