-- Índices para performance dos filtros (Financeiro, Comissões, Clientes)

-- Financeiro: filtro por mês/ano em client_installments
CREATE INDEX IF NOT EXISTS idx_client_installments_due_date
  ON public.client_installments(due_date);

CREATE INDEX IF NOT EXISTS idx_client_installments_confirmed_at
  ON public.client_installments(confirmed_at);

-- Comissões: filtro por mês/ano e por vendedor
CREATE INDEX IF NOT EXISTS idx_client_commissions_created_at
  ON public.client_commissions(created_at);

CREATE INDEX IF NOT EXISTS idx_client_commissions_paid_at
  ON public.client_commissions(paid_at);

CREATE INDEX IF NOT EXISTS idx_client_commissions_vendedor_id
  ON public.client_commissions(vendedor_id);

-- Clientes: novos filtros
CREATE INDEX IF NOT EXISTS idx_clients_city
  ON public.clients(city);

CREATE INDEX IF NOT EXISTS idx_clients_system_power_kwp
  ON public.clients(system_power_kwp);

CREATE INDEX IF NOT EXISTS idx_clients_inverter_brand
  ON public.clients(inverter_brand);

CREATE INDEX IF NOT EXISTS idx_clients_panel_brand
  ON public.clients(panel_brand);

CREATE INDEX IF NOT EXISTS idx_clients_inverter_power_w
  ON public.clients(inverter_power_w);

CREATE INDEX IF NOT EXISTS idx_clients_lead_id
  ON public.clients(lead_id);

-- Cliente por org + created_at (paginação padrão)
CREATE INDEX IF NOT EXISTS idx_clients_org_created
  ON public.clients(organization_id, created_at DESC);

-- client_sale: filtro por payment_method
CREATE INDEX IF NOT EXISTS idx_client_sale_payment_method
  ON public.client_sale(payment_method);

-- leads: filtro por lead_source_id (origem do cliente)
CREATE INDEX IF NOT EXISTS idx_leads_lead_source_id
  ON public.leads(lead_source_id);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_user_id
  ON public.leads(assigned_to_user_id);
