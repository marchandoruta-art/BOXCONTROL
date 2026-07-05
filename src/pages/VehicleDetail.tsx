import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { type Vehicle, type VehicleStatus, STATUS_LABELS, STATUS_ORDER } from '@/lib/types';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { QualityCheckDialog } from '@/components/vehicles/QualityCheckDialog';
import { WorkTimer } from '@/components/vehicles/WorkTimer';
import { PartsList } from '@/components/vehicles/PartsList';
import { VehiclePhotos } from '@/components/vehicles/VehiclePhotos';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ShieldCheck, Loader2, Link as LinkIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  const fetchVehicle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from('vehicles').select('*, owner:owners(*)').eq('id', id).maybeSingle();
    setVehicle(data as unknown as Vehicle);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const updateStatus = async (newStatus: VehicleStatus) => {
    if (!vehicle) return;
    if (vehicle.status !== 'control_calidad' && newStatus === 'terminado') {
      toast.warning('Debe pasar primero por Control de Calidad');
      return;
    }
    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', vehicle.id);
    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success(`Estado actualizado a ${STATUS_LABELS[newStatus]}`);
      fetchVehicle();
    }
  };

  const generatePortalLink = async () => {
    if (!vehicle) return;
    const { data, error } = await supabase
      .from('client_portal_tokens')
      .insert({ vehicle_id: vehicle.id, organization_id: vehicle.organization_id })
      .select()
      .single();

    if (error || !data) {
      toast.error('No se pudo generar el enlace');
      return;
    }
    const url = `${window.location.origin}/portal/${data.token}`;
    setPortalUrl(url);
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Enlace copiado al portapapeles');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Vehículo no encontrado</p>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="border-b bg-background px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-mono font-semibold">{vehicle.plate}</span>
        <VehicleStatusBadge status={vehicle.status} />
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {vehicle.brand} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicle.owner && (
              <p className="text-sm text-muted-foreground">
                Cliente: {vehicle.owner.name}
                {vehicle.owner.phone ? ` · ${vehicle.owner.phone}` : ''}
              </p>
            )}
            {vehicle.client_description && (
              <p className="text-sm">
                <span className="font-medium">Motivo de entrada:</span>{' '}
                {vehicle.client_description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {vehicle.status === 'control_calidad' ? (
                <Button
                  onClick={() => setQualityOpen(true)}
                  className="gap-2 bg-status-quality hover:opacity-90 text-white"
                >
                  <ShieldCheck className="h-4 w-4" /> Control de Calidad
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={vehicle.status === 'entregado'}
                  onClick={() => {
                    const idx = STATUS_ORDER.indexOf(vehicle.status);
                    const next = STATUS_ORDER[idx + 1];
                    if (next) updateStatus(next);
                  }}
                >
                  {vehicle.status === 'entregado' ? 'Entregado' : 'Avanzar a siguiente fase'}
                </Button>
              )}
              <Button variant="outline" className="gap-2" onClick={generatePortalLink}>
                <LinkIcon className="h-4 w-4" /> Enlace para el cliente
              </Button>
            </div>

            {portalUrl && (
              <div className="flex items-center gap-2 text-xs bg-muted rounded-md p-2">
                <span className="truncate flex-1">{portalUrl}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => navigator.clipboard.writeText(portalUrl)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <VehiclePhotos vehicleId={vehicle.id} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <WorkTimer vehicleId={vehicle.id} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <PartsList vehicleId={vehicle.id} />
          </CardContent>
        </Card>
      </div>

      <QualityCheckDialog
        vehicleId={vehicle.id}
        vehiclePlate={vehicle.plate}
        vehicleStatus={vehicle.status}
        open={qualityOpen}
        onOpenChange={setQualityOpen}
        onSuccess={fetchVehicle}
      />
    </AppShell>
  );
}
