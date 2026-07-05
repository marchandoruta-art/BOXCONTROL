import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type VehicleStatus, STATUS_LABELS, STATUS_STYLES } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Loader2, Car, ShieldCheck } from 'lucide-react';

const STATUS_PROGRESS: Record<VehicleStatus, number> = {
  recibido: 10,
  presupuestar: 25,
  presupuestado: 40,
  en_reparacion: 60,
  pendiente_piezas: 50,
  control_calidad: 80,
  terminado: 95,
  entregado: 100,
};

const STATUS_DESCRIPTIONS: Record<VehicleStatus, string> = {
  recibido: 'Hemos recibido su vehículo en el taller.',
  presupuestar: 'Estamos preparando el presupuesto de la reparación.',
  presupuestado: 'Presupuesto enviado, a la espera de su aprobación.',
  en_reparacion: 'Su vehículo está siendo reparado por nuestro equipo.',
  pendiente_piezas: 'Estamos a la espera de la llegada de una pieza necesaria.',
  control_calidad: 'Estamos haciendo una prueba de carretera y una revisión final de calidad antes de devolvérselo.',
  terminado: 'La reparación ha finalizado y ha superado el control de calidad.',
  entregado: 'Vehículo entregado. ¡Gracias por confiar en nosotros!',
};

interface PortalData {
  plate: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  organizationName: string;
}

export default function PortalView() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const load = async () => {
    setLoading(true);
    const { data: tokenRow, error: tokenError } = await supabase
      .from('client_portal_tokens')
      .select('vehicle_id, revoked, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenError || !tokenRow || tokenRow.revoked || new Date(tokenRow.expires_at) < new Date()) {
      setError('Este enlace no es válido o ha caducado.');
      setLoading(false);
      return;
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('plate, brand, model, status, organizations(name)')
      .eq('id', tokenRow.vehicle_id)
      .maybeSingle();

    if (vehicleError || !vehicle) {
      setError('No se pudo cargar la información del vehículo.');
      setLoading(false);
      return;
    }

    setData({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      status: vehicle.status as VehicleStatus,
      organizationName: (vehicle as any).organizations?.name ?? '',
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground text-center">{error}</p>
      </div>
    );
  }

  const pct = STATUS_PROGRESS[data.status] ?? 0;

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <header className="text-center space-y-1">
          <h1 className="text-xl font-bold">{data.organizationName}</h1>
          <p className="text-xs text-muted-foreground">Seguimiento de su vehículo</p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              <span className="font-mono tracking-wider">{data.plate}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.brand} {data.model}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado actual</span>
              <span className={cn('status-badge', STATUS_STYLES[data.status])}>{STATUS_LABELS[data.status]}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-right">{pct}% completado</p>
            <p className="text-sm pt-1 flex items-start gap-1.5">
              {data.status === 'control_calidad' && <ShieldCheck className="h-4 w-4 text-status-quality flex-shrink-0 mt-0.5" />}
              {STATUS_DESCRIPTIONS[data.status]}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
