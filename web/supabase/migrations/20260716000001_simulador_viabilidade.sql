-- Peça 3: histórico de simulações de viabilidade por empresa (standalone, sem vínculo CRM).
CREATE TABLE IF NOT EXISTS simulador_viabilidade (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome              text NOT NULL,
  concessionaria_id uuid REFERENCES simulador_concessionarias(id) ON DELETE SET NULL,
  input             jsonb NOT NULL,            -- snapshot do ViabilidadeInput
  cliente_nome      text,                      -- texto livre, só p/ o PDF
  cliente_cidade    text,
  tir               numeric(10, 6) NOT NULL DEFAULT 0,  -- resumo p/ listagem
  vpl               numeric(16, 2) NOT NULL DEFAULT 0,
  payback_anos      integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_viabilidade_org
  ON simulador_viabilidade(organization_id);

ALTER TABLE simulador_viabilidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador viabilidade"
  ON simulador_viabilidade FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
