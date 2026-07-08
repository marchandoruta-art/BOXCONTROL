-- Campos extra en vehicles
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS fuel_type text CHECK (fuel_type IN ('gasolina','diesel','electrico','hibrido','hibrido_enchufable','glp','otro')),
  ADD COLUMN IF NOT EXISTS mileage integer,
  ADD COLUMN IF NOT EXISTS estimated_delivery date,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Tareas por vehículo
CREATE TABLE vehicle_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  completed       boolean NOT NULL DEFAULT false,
  completed_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at    timestamptz,
  sort_order      integer NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicle_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_org_access" ON vehicle_tasks
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX vehicle_tasks_idx ON vehicle_tasks(vehicle_id, sort_order);
