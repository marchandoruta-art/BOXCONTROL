-- ============================================================
-- ÓRDENES DE TRABAJO / PRESUPUESTOS
-- ============================================================
CREATE TABLE work_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  number          serial,
  status          text NOT NULL DEFAULT 'borrador'
                    CHECK (status IN ('borrador','aprobado','en_curso','cerrado','cancelado')),
  notes           text,
  iva_pct         numeric(5,2) NOT NULL DEFAULT 21,
  discount_pct    numeric(5,2) NOT NULL DEFAULT 0,
  created_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE work_order_lines (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  type          text NOT NULL DEFAULT 'labor' CHECK (type IN ('labor','part','other')),
  description   text NOT NULL,
  quantity      numeric(10,2) NOT NULL DEFAULT 1,
  unit_price    numeric(10,2) NOT NULL DEFAULT 0,
  sort_order    integer NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_org_access" ON work_orders
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE work_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wol_org_access" ON work_order_lines
  USING (work_order_id IN (SELECT id FROM work_orders WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())))
  WITH CHECK (work_order_id IN (SELECT id FROM work_orders WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));

CREATE INDEX work_orders_vehicle_idx ON work_orders(vehicle_id);
CREATE INDEX work_order_lines_wo_idx ON work_order_lines(work_order_id, sort_order);
