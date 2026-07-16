-- Peça 2 do Simulador de Viabilidade: tabela de concessionárias por empresa.
-- Aditiva. Guarda apenas os campos BRUTOS (amarelo); os derivados (cinza) são
-- recalculados na plataforma por derivarConcessionaria() e NUNCA gravados.
CREATE TABLE IF NOT EXISTS simulador_concessionarias (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome                        text NOT NULL,
  tipo_processo               text NOT NULL DEFAULT 'Reajuste 2025',
  tusd                        numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh
  te                          numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh
  tusd_fio_b                  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col H)
  tusd_fio_a                  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col J)
  tusd_ped                    numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col L)
  tusd_tfsee                  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/MWh (col N)
  icms                        numeric(6, 4)  NOT NULL DEFAULT 0,  -- fração
  pis_cofins                  numeric(6, 4)  NOT NULL DEFAULT 0,  -- fração
  demanda_contratada_sem_imp  numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/kW (col V)
  demanda_geracao_sem_imp     numeric(12, 4) NOT NULL DEFAULT 0,  -- R$/kW (col X)
  aplica_reajuste_1430        boolean NOT NULL DEFAULT true,      -- col AA
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulador_concessionarias_org
  ON simulador_concessionarias(organization_id);

-- Evita duplicar a mesma concessionária por empresa (seed idempotente por nome).
CREATE UNIQUE INDEX IF NOT EXISTS uq_simulador_concessionarias_org_nome
  ON simulador_concessionarias(organization_id, nome);

ALTER TABLE simulador_concessionarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador concessionarias"
  ON simulador_concessionarias FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
