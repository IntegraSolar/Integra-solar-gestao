-- Simulador Híbrido/Off-grid — cadastro de equipamentos por empresa (máx. 100 por tipo — imposto na action).

-- PAINÉIS FOTOVOLTAICOS
CREATE TABLE IF NOT EXISTS simulador_equip_paineis (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fabricante       text NOT NULL,
  modelo           text NOT NULL,
  potencia_wp      numeric NOT NULL,
  voc              numeric NOT NULL,
  vmp              numeric NOT NULL,
  isc              numeric NOT NULL,
  imp              numeric NOT NULL,
  area_m2          numeric NOT NULL,
  coef_pmp         numeric,
  coef_voc         numeric,
  noct             numeric,
  eficiencia       numeric,
  peso_kg          numeric,
  garantia_anos    integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_simulador_equip_paineis_org ON simulador_equip_paineis(organization_id);
ALTER TABLE simulador_equip_paineis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage simulador equip paineis"
  ON simulador_equip_paineis FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- INVERSORES (Híbridos / Off-grid / On-grid)
CREATE TABLE IF NOT EXISTS simulador_equip_inversores (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fabricante       text NOT NULL,
  modelo           text NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('Híbrido','Off-grid','On-grid')),
  pot_ca_nom_w     numeric NOT NULL,
  mppt_min_v       numeric NOT NULL,
  mppt_max_v       numeric NOT NULL,
  tensao_cc_max_v  numeric NOT NULL,
  num_mppt         integer NOT NULL,
  corr_max_mppt_a  numeric NOT NULL,
  pot_fv_max_wp    numeric NOT NULL,
  pot_surge_w      numeric,
  tensao_cc_bat_v  numeric,
  eficiencia       numeric,
  backup           boolean NOT NULL DEFAULT false,
  paralelismo      integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_simulador_equip_inversores_org ON simulador_equip_inversores(organization_id);
ALTER TABLE simulador_equip_inversores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage simulador equip inversores"
  ON simulador_equip_inversores FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- BATERIAS
CREATE TABLE IF NOT EXISTS simulador_equip_baterias (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  fabricante       text NOT NULL,
  modelo           text NOT NULL,
  tecnologia       text NOT NULL CHECK (tecnologia IN ('LiFePO4','Lítio NMC','Chumbo-ácido','Gel','AGM')),
  tensao_v         numeric NOT NULL,
  capacidade_ah    numeric NOT NULL,
  energia_kwh      numeric,
  corr_max_a       numeric,
  corr_recom_a     numeric,
  dod              numeric,
  soc_min          numeric,
  ciclos           integer,
  eficiencia       numeric,
  garantia_anos    integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_simulador_equip_baterias_org ON simulador_equip_baterias(organization_id);
ALTER TABLE simulador_equip_baterias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can manage simulador equip baterias"
  ON simulador_equip_baterias FOR ALL
  USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
