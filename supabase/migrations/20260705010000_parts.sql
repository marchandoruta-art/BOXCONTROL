-- Piezas/recambios usados por vehículo (sin facturación, solo control operativo)
CREATE TABLE public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pendiente', -- pendiente | pedido | recibido
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parts_vehicle ON public.parts(vehicle_id);

ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view parts" ON public.parts
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can insert parts" ON public.parts
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can update parts" ON public.parts
  FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can delete parts" ON public.parts
  FOR DELETE TO authenticated USING (organization_id = public.get_user_organization_id());
