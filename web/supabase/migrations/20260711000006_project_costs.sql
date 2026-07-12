CREATE TABLE IF NOT EXISTS project_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  cost_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_costs_client ON project_costs(client_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_org ON project_costs(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_date ON project_costs(cost_date);

ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage project costs"
  ON project_costs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
