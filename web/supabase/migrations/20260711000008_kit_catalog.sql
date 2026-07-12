CREATE TABLE IF NOT EXISTS kit_catalog (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  code                  text,
  description           text,
  status                text NOT NULL DEFAULT 'ativo',
  -- Módulos
  panel_brand           text,
  panel_model           text,
  panel_power_w         numeric(10, 2),
  panel_qty             integer NOT NULL DEFAULT 0,
  -- Inversores
  inverter_brand        text,
  inverter_model        text,
  inverter_power_w      numeric(10, 2),
  inverter_qty          integer NOT NULL DEFAULT 0,
  -- Calculados
  total_power_kwp       numeric(10, 3),
  monthly_generation_kwh numeric(12, 2),
  annual_generation_kwh  numeric(12, 2),
  -- Precificação (protegido — nunca exposto a usuários restritos)
  kit_value             numeric(12, 2) NOT NULL DEFAULT 0,
  km_rodados            numeric(10, 2) NOT NULL DEFAULT 0,
  supplier_name         text,
  sale_price            numeric(12, 2),
  -- Meta
  created_by_user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kit_catalog_org ON kit_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_kit_catalog_status ON kit_catalog(status);

ALTER TABLE kit_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage kit catalog"
  ON kit_catalog FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
