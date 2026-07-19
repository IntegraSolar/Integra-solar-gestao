-- Simulador Híbrido/Off-grid — biblioteca de cargas típicas por empresa.
-- Semeada por upsert idempotente no primeiro acesso à tela (ver
-- seedCargasBiblioteca), por isso a constraint única em (organization_id, nome).
CREATE TABLE IF NOT EXISTS simulador_cargas_biblioteca (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome                text NOT NULL,
  categoria           text,
  potencia_unit_w     numeric NOT NULL CHECK (potencia_unit_w > 0),
  potencia_partida_w  numeric NOT NULL CHECK (potencia_partida_w > 0),
  tensao_v            numeric NOT NULL CHECK (tensao_v > 0),
  fator_potencia      numeric NOT NULL CHECK (fator_potencia > 0 AND fator_potencia <= 1),
  horas_dia           numeric NOT NULL CHECK (horas_dia >= 0 AND horas_dia <= 24),
  dias_semana         integer NOT NULL CHECK (dias_semana >= 1 AND dias_semana <= 7),
  hora_inicio         numeric NOT NULL CHECK (hora_inicio >= 0 AND hora_inicio <= 24),
  hora_fim            numeric NOT NULL CHECK (hora_fim >= 0 AND hora_fim <= 24),
  prioridade          text,
  critica             boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT simulador_cargas_biblioteca_org_nome_key UNIQUE (organization_id, nome),
  CONSTRAINT simulador_cargas_biblioteca_partida_ge_nominal
    CHECK (potencia_partida_w >= potencia_unit_w)
);

CREATE INDEX IF NOT EXISTS idx_simulador_cargas_biblioteca_org
  ON simulador_cargas_biblioteca(organization_id);

ALTER TABLE simulador_cargas_biblioteca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage simulador cargas biblioteca"
  ON simulador_cargas_biblioteca FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
