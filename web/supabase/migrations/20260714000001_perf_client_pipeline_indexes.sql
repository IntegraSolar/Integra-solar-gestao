-- Performance: índices de organization_id e client_id nas tabelas da cadeia client_*
-- Essas tabelas eram consultadas por organization_id (dashboard, financeiro, comissões,
-- relatórios) e por client_id (detalhe do cliente, portal), mas não tinham índice nesses
-- campos — resultando em sequential scans que degradam conforme o volume/nº de empresas.
-- Postgres não indexa FKs automaticamente.
--
-- Índices leves (btree) e idempotentes. Em tabelas grandes, considere trocar por
-- CREATE INDEX CONCURRENTLY (fora de transação) para evitar lock de escrita.

-- client_installments (já possui due_date, confirmed_at)
CREATE INDEX IF NOT EXISTS idx_client_installments_org ON public.client_installments(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_installments_client ON public.client_installments(client_id);

-- client_sale (já possui payment_method)
CREATE INDEX IF NOT EXISTS idx_client_sale_org ON public.client_sale(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_sale_client ON public.client_sale(client_id);

-- client_contracts
CREATE INDEX IF NOT EXISTS idx_client_contracts_org ON public.client_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_contracts_client ON public.client_contracts(client_id);

-- client_commissions (já possui created_at, paid_at, vendedor_id)
CREATE INDEX IF NOT EXISTS idx_client_commissions_org ON public.client_commissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_commissions_client ON public.client_commissions(client_id);

-- client_projects
CREATE INDEX IF NOT EXISTS idx_client_projects_org ON public.client_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_client ON public.client_projects(client_id);

-- client_purchases
CREATE INDEX IF NOT EXISTS idx_client_purchases_org ON public.client_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_purchases_client ON public.client_purchases(client_id);

-- client_deliveries
CREATE INDEX IF NOT EXISTS idx_client_deliveries_org ON public.client_deliveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_deliveries_client ON public.client_deliveries(client_id);

-- client_obras
CREATE INDEX IF NOT EXISTS idx_client_obras_org ON public.client_obras(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_obras_client ON public.client_obras(client_id);

-- client_obra_deliveries
CREATE INDEX IF NOT EXISTS idx_client_obra_deliveries_org ON public.client_obra_deliveries(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_obra_deliveries_client ON public.client_obra_deliveries(client_id);

-- client_pos_obra
CREATE INDEX IF NOT EXISTS idx_client_pos_obra_org ON public.client_pos_obra(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_pos_obra_client ON public.client_pos_obra(client_id);

-- client_attachments (embed na listagem de clientes e portal)
CREATE INDEX IF NOT EXISTS idx_client_attachments_org ON public.client_attachments(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_attachments_client ON public.client_attachments(client_id);
