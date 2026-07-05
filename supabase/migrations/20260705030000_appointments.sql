-- ============================================================
-- APPOINTMENTS (Citas / Agenda)
-- ============================================================

CREATE TABLE appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id         uuid REFERENCES owners(id) ON DELETE SET NULL,
  vehicle_plate    text,
  vehicle_brand    text,
  vehicle_model    text,
  description      text NOT NULL,
  scheduled_at     timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  assigned_to      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'pendiente'
                   CHECK (status IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX appointments_org_scheduled ON appointments(organization_id, scheduled_at);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments_org_access" ON appointments
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
