-- Tabela de templates de proposta
CREATE TABLE IF NOT EXISTS proposal_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         text NOT NULL,
  category     text,
  file_path    text NOT NULL,
  is_default   boolean NOT NULL DEFAULT false,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proposal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_templates_org_isolation" ON proposal_templates
  USING (org_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  ));

-- Extensões na tabela proposals existente
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS template_id       uuid REFERENCES proposal_templates(id),
  ADD COLUMN IF NOT EXISTS preco_total       numeric,
  ADD COLUMN IF NOT EXISTS custo_kit         numeric,
  ADD COLUMN IF NOT EXISTS custo_projeto     numeric,
  ADD COLUMN IF NOT EXISTS custo_instalacao  numeric,
  ADD COLUMN IF NOT EXISTS custo_km          numeric,
  ADD COLUMN IF NOT EXISTS custo_ca          numeric,
  ADD COLUMN IF NOT EXISTS valor_entrada      numeric,
  ADD COLUMN IF NOT EXISTS valor_parcelas     numeric,
  ADD COLUMN IF NOT EXISTS num_parcelas       integer,
  ADD COLUMN IF NOT EXISTS pdf_url            text,
  ADD COLUMN IF NOT EXISTS docx_url           text,
  ADD COLUMN IF NOT EXISTS gerado_em          timestamptz;
