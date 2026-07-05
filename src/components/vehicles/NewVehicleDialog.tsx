import { useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function NewVehicleDialog({ onSuccess }: { onSuccess?: () => void }) {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setOwnerName('');
    setOwnerPhone('');
    setPlate('');
    setBrand('');
    setModel('');
    setDescription('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setLoading(true);

    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .insert({ organization_id: organizationId, name: ownerName, phone: ownerPhone || null })
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
      client_description: description || null,
      created_by: user?.id,
    });

    if (vehicleError) {
      toast.error('Error al crear el vehículo: ' + vehicleError.message);
      setLoading(false);
      return;
    }

    toast.success(`${plate.toUpperCase()} dado de alta`);
    reset();
    setLoading(false);
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Vehículo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo vehículo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Matrícula</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Motivo de entrada</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ruido en frenos, revisión..." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Dar de alta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
