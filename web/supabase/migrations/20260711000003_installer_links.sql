CREATE TABLE IF NOT EXISTS installer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_installer_links_token ON installer_links(token);
CREATE INDEX IF NOT EXISTS idx_installer_links_client ON installer_links(client_id);

ALTER TABLE installer_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage installer links"
  ON installer_links FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
