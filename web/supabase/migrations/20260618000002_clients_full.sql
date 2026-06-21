-- web/supabase/migrations/20260618000002_clients_full.sql
-- ─────────────────────────────────────────────────────────────────
-- Clientes: adiciona colunas + 4 novas tabelas relacionadas
-- Apply via: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- ── Colunas extras na tabela clients ─────────────────────────────
alter table public.clients
  add column if not exists lead_id            uuid references public.leads(id) on delete set null,
  -- Aba 1
  add column if not exists type               text default 'pf',
  add column if not exists cpf_cnpj          text,
  add column if not exists email              text,
  add column if not exists "number"           text,
  add column if not exists neighborhood       text,
  add column if not exists zip                text,
  add column if not exists state              text,
  -- Aba 2
  add column if not exists promised_kwh       numeric,
  add column if not exists system_power_kwp   numeric,
  add column if not exists panel_brand        text,
  add column if not exists panel_power_w      numeric,
  add column if not exists inverter_brand     text,
  add column if not exists inverter_power_w   numeric,
  add column if not exists specific_panels    boolean default false,
  add column if not exists specific_inverter  boolean default false,
  add column if not exists direct_delivery    boolean default false,
  add column if not exists viability_proposal_id uuid references public.proposals(id) on delete set null,
  -- Aba 4
  add column if not exists has_adaptation_works boolean default false,
  add column if not exists roof_type          text,
  add column if not exists roof_orientation   text,
  add column if not exists maps_coordinates   text,
  add column if not exists entry_breaker      text,
  add column if not exists entry_cable_mm     text,
  add column if not exists inspection_done    boolean default false,
  add column if not exists client_notes       text,
  add column if not exists extra_promises     text,
  -- Aba 5
  add column if not exists delivery_start_date date,
  add column if not exists contract_date      date,
  add column if not exists contract_max_days  integer,
  -- Pipeline tracking
  add column if not exists pipeline_stage     text default 'crm',
  add column if not exists completed_tabs     jsonb default '{}',
  add column if not exists pipeline_flags     jsonb default '{}',
  add column if not exists updated_at         timestamptz default now();

-- ── client_sale ────────────────────────────────────────────────────
create table if not exists public.client_sale (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_value      numeric not null default 0,
  payment_method  text,
  nf_notes        text,
  commission_pct  numeric default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.client_sale enable row level security;
create policy "client_sale_org_isolation" on public.client_sale for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── client_installments ───────────────────────────────────────────
create table if not exists public.client_installments (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  position          integer not null,
  due_date          date not null,
  amount            numeric not null,
  notes             text,
  status            text not null default 'pendente',
  payment_proof_url text,
  confirmed_at      timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists client_installments_client_id_idx on public.client_installments(client_id);
alter table public.client_installments enable row level security;
create policy "client_installments_org_isolation" on public.client_installments for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── client_attachments ────────────────────────────────────────────
create table if not exists public.client_attachments (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type            text not null,
  file_url        text not null,
  uploaded_at     timestamptz not null default now()
);
alter table public.client_attachments enable row level security;
create policy "client_attachments_org_isolation" on public.client_attachments for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── client_contracts ──────────────────────────────────────────────
create table if not exists public.client_contracts (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  contract_url          text,
  power_of_attorney_url text,
  signed                boolean not null default false,
  signed_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.client_contracts enable row level security;
create policy "client_contracts_org_isolation" on public.client_contracts for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
