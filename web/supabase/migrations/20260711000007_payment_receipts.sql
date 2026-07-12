CREATE TABLE IF NOT EXISTS payment_receipts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version          integer NOT NULL DEFAULT 1,
  total_paid       numeric(12, 2) NOT NULL,
  pdf_path         text,
  token            text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_client ON payment_receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_org ON payment_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_token ON payment_receipts(token);

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage payment receipts"
  ON payment_receipts FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
