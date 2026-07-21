-- Autor do lead.
--
-- O controle de acesso do CRM (web/lib/crm/acesso.ts) diz que o vendedor
-- enxerga o lead do qual é responsável OU que ele mesmo criou. A segunda metade
-- da regra nunca funcionou: a coluna não existia, então o lead criado pelo
-- vendedor nascia sem responsável e sem autor — e sumia do funil dele.
--
-- Fica nullable de propósito: os leads já existentes não têm autor conhecido, e
-- inventar um seria pior do que assumir "lead da empresa". Sem autor e sem
-- responsável, o lead segue visível só para quem vê todos, que é a regra atual.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- O funil do vendedor filtra por (assigned_to_user_id = eu OR created_by = eu).
CREATE INDEX IF NOT EXISTS idx_leads_created_by
  ON public.leads(organization_id, created_by);
