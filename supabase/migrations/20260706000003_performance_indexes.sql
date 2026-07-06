-- Performance indexes — Fase 1 da auditoria de performance (2026-07-06)
-- Problema: 16 Foreign Keys sem índice causando full scans em queries críticas.
-- Impacto esperado: -1.5s no dashboard, queries de pipeline e financeiro.

-- ============================================================
-- 1. clients: lead_id (FK usada em filtros de vendedor/financeiro)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_lead_id
  ON public.clients(lead_id);

-- ============================================================
-- 2. leads: assigned_to_user_id (FK usada em filtros de responsável no CRM)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_user_id
  ON public.leads(assigned_to_user_id);

-- ============================================================
-- 3. tasks: relacionamentos com leads e clientes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_related_to_lead_id
  ON public.tasks(related_to_lead_id);

CREATE INDEX IF NOT EXISTS idx_tasks_related_to_client_id
  ON public.tasks(related_to_client_id);

-- ============================================================
-- 4. client_installments: filtros combinados de financeiro
--    Queries usam: .eq('organization_id').gte('due_date').lte('due_date')
--                  .eq('organization_id').eq('status')
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_installments_org_due
  ON public.client_installments(organization_id, due_date);

CREATE INDEX IF NOT EXISTS idx_client_installments_org_status
  ON public.client_installments(organization_id, status);

-- ============================================================
-- 5. Tabelas de pipeline: (organization_id, status) — usadas em countByStatus()
--    Cada linha era um full scan antes deste índice composto.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_projects_org_status
  ON public.client_projects(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_client_purchases_org_status
  ON public.client_purchases(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_client_obras_org_status
  ON public.client_obras(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_client_deliveries_org_status
  ON public.client_deliveries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_client_obra_deliveries_org_status
  ON public.client_obra_deliveries(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_client_pos_obra_org_status
  ON public.client_pos_obra(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_client_commissions_org_status
  ON public.client_commissions(organization_id, status);

-- ============================================================
-- 6. RLS: organization_members(user_id) — subquery executada por linha em get_my_org_ids()
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON public.organization_members(user_id);

-- ============================================================
-- 7. Tabelas sem índice em organization_id (acesso por org sempre filtrado)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_sale_organization_id
  ON public.client_sale(organization_id);

CREATE INDEX IF NOT EXISTS idx_client_attachments_organization_id
  ON public.client_attachments(organization_id);

CREATE INDEX IF NOT EXISTS idx_client_contracts_org_status
  ON public.client_contracts(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_items_organization_id
  ON public.stock_items(organization_id);
