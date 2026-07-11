CREATE TABLE IF NOT EXISTS obra_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_delivery_id uuid NOT NULL REFERENCES client_obra_deliveries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obra_photos_delivery ON obra_photos(obra_delivery_id);

ALTER TABLE obra_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view obra photos"
  ON obra_photos FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert obra photos"
  ON obra_photos FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can delete obra photos"
  ON obra_photos FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
