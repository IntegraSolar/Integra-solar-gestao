-- Tabela de anexos dinâmicos para projetos (substitui art_url, projeto_url, parecer_acesso_url)
CREATE TABLE IF NOT EXISTS project_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_attachments_project ON project_attachments(project_id);

ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view project attachments"
  ON project_attachments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert project attachments"
  ON project_attachments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can delete project attachments"
  ON project_attachments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
