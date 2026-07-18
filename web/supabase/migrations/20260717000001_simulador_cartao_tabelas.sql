-- Simulador de parcelamento no cartão: tabelas de taxa por empresa (máx. 3 — imposto na action).
CREATE TABLE IF NOT EXISTS simulador_cartao_tabelas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome             text NOT NULL,
  max_parcelas     integer NOT NULL DEFAULT 12 CHECK (max_parcelas BETWEEN 1 AND 24),
  observacao       text,
  taxas            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "N": fração }
  ordem            integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_cartao_tabelas_org
  ON simulador_cartao_tabelas(organization_id);

ALTER TABLE simulador_cartao_tabelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador cartao tabelas"
  ON simulador_cartao_tabelas FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
