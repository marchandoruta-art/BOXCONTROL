import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Car, User, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { type VehiclePriority, PRIORITY_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRIORITY_OPTIONS: { value: VehiclePriority; color: string }[] = [
  { value: 'baja', color: 'border-[hsl(215_60%_62%)] text-[hsl(215_60%_62%)]' },
  { value: 'normal', color: 'border-[hsl(215_15%_55%)] text-[hsl(215_15%_55%)]' },
  { value: 'alta', color: 'border-[hsl(35_92%_55%)] text-[hsl(35_92%_55%)]' },
  { value: 'urgente', color: 'border-[hsl(0_72%_60%)] text-[hsl(0_72%_60%)]' },
];

export function NewVehicleDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState<VehiclePriority>('normal');

  // Owner fields
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Vehicle fields
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setOwnerName(''); setOwnerPhone(''); setOwnerEmail('');
    setPlate(''); setBrand(''); setModel(''); setYear(''); setColor('');
    setDescription(''); setPriority('normal');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setLoading(true);

    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .insert({
        organization_id: organizationId,
        name: ownerName,
        phone: ownerPhone || null,
        email: ownerEmail || null,
      })
      .select()
      .single();

    if (ownerError || !owner) {
      toast.error('Error al crear el cliente: ' + (ownerError?.message ?? ''));
      setLoading(false);
      return;
    }

    const { error: vehicleError } = await supabase.from('vehicles').insert({
      organization_id: organizationId,
      owner_id: owner.id,
      plate: plate.toUpperCase(),
      brand,
      model,
      year: year ? Number(year) : null,
      color: color || null,
      client_description: description || null,
      priority,
      created_by: user?.id,
    });

    if (vehicleError) {
      toast.error('Error al crear el vehículo: ' + vehicleError.message);
      setLoading(false);
      return;
    }

    toast.success(`${plate.toUpperCase()} dado de alta · Prioridad: ${PRIORITY_LABELS[priority]}`);
    reset();
    setLoading(false);
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Vehículo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-4 w-4 text-primary" /> Nuevo vehículo
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prioridad */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Prioridad
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map(({ value, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={cn(
                    'py-1.5 rounded-md text-xs font-medium border-2 transition-all',
                    priority === value
                      ? cn(color, 'bg-current/10')
                      : 'border-border/50 text-muted-foreground hover:border-border'
                  )}
                  style={priority === value ? { backgroundColor: 'transparent' } : {}}
                >
                  {PRIORITY_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <User className="h-3 w-3" /> Cliente
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nombre *"
                  required
                  className="text-sm h-8 bg-muted/30"
                />
              </div>
              <div className="space-y-1">
                <Input
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="Teléfono"
                  type="tel"
                  className="text-sm h-8 bg-muted/30"
                />
              </div>
            </div>
            <Input
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="Email (opcional)"
              type="email"
              className="text-sm h-8 bg-muted/30"
            />
          </div>

          {/* Vehículo */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Car className="h-3 w-3" /> Vehículo
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="Matrícula *"
                required
                className="text-sm h-8 bg-muted/30 font-mono"
              />
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Marca *"
                required
                className="text-sm h-8 bg-muted/30"
              />
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Modelo *"
                required
                className="text-sm h-8 bg-muted/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Año (ej. 2019)"
                type="number"
                min={1900}
                max={2030}
                className="text-sm h-8 bg-muted/30"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Color (ej. Blanco)"
                className="text-sm h-8 bg-muted/30"
              />
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-1">
            <Label className="text-xs">Motivo de entrada</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ruido en frenos, revisión, ITV..."
              className="text-sm bg-muted/30"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Dar de alta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
