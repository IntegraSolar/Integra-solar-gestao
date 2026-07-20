-- Simulações salvas do simulador Híbrido/Off-grid, por empresa.
-- Standalone, sem vínculo com o CRM (identificação do cliente em texto livre).
--
-- Duas diferenças deliberadas em relação a simulador_viabilidade:
--  1. O snapshot guarda o estado da TELA e uma cópia dos equipamentos usados,
--     para que reabrir reproduza os mesmos números mesmo que o catálogo mude.
--  2. payback_anos é NULLABLE: o investimento pode não se pagar dentro do
--     horizonte, e gravar 0 nesse caso leria como "se paga imediatamente".
CREATE TABLE IF NOT EXISTS simulador_hibrido_simulacoes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome                 text NOT NULL,
  snapshot             jsonb NOT NULL,
  cliente_nome         text,
  cliente_cidade       text,
  cliente_uf           text,
  concessionaria       text,
  responsavel_tecnico  text,
  potencia_kwp         numeric NOT NULL DEFAULT 0,
  investimento_total   numeric NOT NULL DEFAULT 0,
  vpl                  numeric NOT NULL DEFAULT 0,
  tir                  numeric NOT NULL DEFAULT 0,
  payback_anos         numeric,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_hibrido_simulacoes_org
  ON simulador_hibrido_simulacoes(organization_id);

ALTER TABLE simulador_hibrido_simulacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador hibrido simulacoes"
  ON simulador_hibrido_simulacoes FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
