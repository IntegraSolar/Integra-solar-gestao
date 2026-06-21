-- ═══════════════════════════════════════════════════════════════════
-- Integra Solar CRM — Schema inicial
-- Migração 001: Schema completo com auth multi-tenant
-- Execute via: Supabase Dashboard → SQL Editor ou Supabase CLI
-- ═══════════════════════════════════════════════════════════════════

-- ── Extensões ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. ORGANIZATIONS ─────────────────────────────────────────────
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text not null default 'starter'
              check (plan in ('starter', 'professional', 'enterprise')),
  status      text not null default 'active'
              check (status in ('active', 'suspended', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.organizations is 'Empresas clientes da plataforma (tenants).';

-- ── 2. PROFILES (espelha auth.users) ─────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Perfil público de cada usuário autenticado.';

-- ── 3. ORGANIZATION MEMBERS ──────────────────────────────────────
create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null check (role in ('owner', 'admin', 'manager', 'user')),
  created_at      timestamptz not null default now(),
  unique(organization_id, user_id)
);
comment on table public.organization_members is 'Relação entre usuários e organizações com papel (role).';

create index on public.organization_members(user_id);
create index on public.organization_members(organization_id);

-- ── Trigger: auto-criar profile quando auth.users recebe novo user ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Função: retornar org IDs do usuário atual ────────────────────
create or replace function public.get_my_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
$$;

-- ── Função: retornar role do usuário em uma org ──────────────────
create or replace function public.get_my_role(org_id uuid)
returns text
language sql
security definer
stable
as $$
  select role
  from public.organization_members
  where user_id = auth.uid()
    and organization_id = org_id
$$;

-- ── Função: atualizar updated_at automaticamente ─────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- TABELAS OPERACIONAIS DO CRM (serão populadas nos próximos planos)
-- ════════════════════════════════════════════════════════════════

-- ENUMs operacionais
do $$ begin create type proposal_status as enum
  ('draft','sent','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type project_status as enum
  ('not_submitted','submitted','awaiting_approval','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin create type work_status as enum
  ('awaiting_scheduling','scheduled','in_progress','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type payment_status as enum
  ('paid','pending','overdue','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type financial_entry_type as enum
  ('revenue','expense');
exception when duplicate_object then null; end $$;

-- Pipeline stages
create table public.pipeline_stages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  "order"         integer not null,
  color           text not null default '#6B7A90',
  is_final_stage  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(organization_id, "order")
);

-- Lead sources
create table public.lead_sources (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  unique(organization_id, name)
);

-- Clients
create table public.clients (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  name                     text not null,
  document_number          text,
  phone                    text,
  email                    text,
  street                   text,
  number                   text,
  complement               text,
  neighborhood             text,
  city                     text,
  state                    text,
  zip_code                 text,
  current_project_stage_id uuid references public.pipeline_stages(id),
  system_type              text default 'On-Grid',
  estimated_kwp            numeric(10,2),
  contract_signed_date     date,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index on public.clients(organization_id);

-- Leads
create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  phone               text not null,
  city                text,
  lead_source_id      uuid references public.lead_sources(id),
  observations        text,
  next_action_date    date,
  current_stage_id    uuid not null references public.pipeline_stages(id),
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  system_type         text default 'On-Grid',
  estimated_kwp       numeric(10,2),
  estimated_value     numeric(15,2),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.leads(organization_id);
create index on public.leads(current_stage_id);

-- Suppliers
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  contact_person  text,
  phone           text,
  email           text,
  city            text,
  state           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.suppliers(organization_id);

-- Proposals
create table public.proposals (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  client_id              uuid not null references public.clients(id),
  lead_id                uuid references public.leads(id) on delete set null,
  version_number         integer not null default 1,
  total_modules          integer not null default 0,
  module_power_wp        numeric(10,2) not null default 0,
  total_inverters        integer not null default 0,
  inverter_power_w       numeric(10,2) not null default 0,
  supplier_id            uuid references public.suppliers(id),
  kit_value              numeric(15,2) not null default 0,
  total_power_kwp        numeric(10,2) not null default 0,
  monthly_generation_kwh numeric(10,2) not null default 0,
  final_value            numeric(15,2) not null default 0,
  status                 proposal_status not null default 'draft',
  created_by_user_id     uuid references public.profiles(id),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on public.proposals(organization_id);
create index on public.proposals(client_id);

-- Contracts
create table public.contracts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid not null references public.clients(id),
  proposal_id     uuid references public.proposals(id),
  signature_date  date,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected')),
  rejection_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.contracts(organization_id);

-- Financial entries
create table public.financial_entries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id       uuid references public.clients(id),
  contract_id     uuid references public.contracts(id),
  description     text,
  entry_type      financial_entry_type not null default 'revenue',
  due_date        date not null default current_date,
  value           numeric(15,2) not null default 0,
  status          payment_status not null default 'pending',
  payment_date    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on public.financial_entries(organization_id);

-- Projects (licenciamento)
create table public.projects (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  client_id            uuid not null references public.clients(id),
  assigned_engineer_id uuid references public.profiles(id),
  status               project_status not null default 'not_submitted',
  submission_date      date,
  approval_date        date,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.projects(organization_id);

-- Purchases
create table public.purchases (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations(id) on delete cascade,
  client_id              uuid references public.clients(id),
  supplier_id            uuid not null references public.suppliers(id),
  purchase_date          date not null default current_date,
  status                 text not null default 'pending'
                         check (status in ('pending','approved','rejected','in_progress','delivered','cancelled')),
  expected_delivery_date date,
  actual_delivery_date   date,
  kit_description        text,
  invoice_number         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index on public.purchases(organization_id);

-- Works (obras)
create table public.works (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  client_id            uuid not null references public.clients(id),
  project_id           uuid references public.projects(id),
  scheduled_date       date,
  start_date           date,
  end_date             date,
  status               work_status not null default 'awaiting_scheduling',
  street               text,
  number               text,
  city                 text,
  state                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.works(organization_id);

-- Tasks
create table public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete cascade,
  title                text not null,
  description          text,
  due_date             date,
  completed_at         timestamptz,
  assigned_to_user_id  uuid references public.profiles(id),
  related_to_lead_id   uuid references public.leads(id) on delete set null,
  related_to_client_id uuid references public.clients(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on public.tasks(organization_id);

-- Notifications
create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  message           text not null,
  is_read           boolean not null default false,
  notification_type text,
  related_entity    text,
  related_entity_id uuid,
  created_at        timestamptz not null default now()
);
create index on public.notifications(user_id);
create index on public.notifications(organization_id);

-- Organization settings (chave-valor por org)
create table public.organization_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setting_key     text not null,
  setting_value   jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(organization_id, setting_key)
);
create index on public.organization_settings(organization_id);

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════

-- Habilitar RLS em todas as tabelas
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.lead_sources enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.suppliers enable row level security;
alter table public.proposals enable row level security;
alter table public.contracts enable row level security;
alter table public.financial_entries enable row level security;
alter table public.projects enable row level security;
alter table public.purchases enable row level security;
alter table public.works enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;
alter table public.organization_settings enable row level security;

-- ── Profiles ─────────────────────────────────────────────────────
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- ── Organizations ─────────────────────────────────────────────────
create policy "orgs_select_members"
  on public.organizations for select
  using (id in (select get_my_org_ids()));

create policy "orgs_update_admins"
  on public.organizations for update
  using (
    id in (select get_my_org_ids())
    and get_my_role(id) in ('owner', 'admin')
  );

-- ── Organization Members ──────────────────────────────────────────
create policy "members_select_same_org"
  on public.organization_members for select
  using (organization_id in (select get_my_org_ids()));

create policy "members_insert_admins"
  on public.organization_members for insert
  with check (
    organization_id in (select get_my_org_ids())
    and get_my_role(organization_id) in ('owner', 'admin')
  );

create policy "members_update_admins"
  on public.organization_members for update
  using (
    organization_id in (select get_my_org_ids())
    and get_my_role(organization_id) in ('owner', 'admin')
  );

create policy "members_delete_admins"
  on public.organization_members for delete
  using (
    organization_id in (select get_my_org_ids())
    and get_my_role(organization_id) in ('owner', 'admin')
  );

-- ── Pipeline Stages ───────────────────────────────────────────────
create policy "pipeline_stages_org_isolation"
  on public.pipeline_stages for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Lead Sources ──────────────────────────────────────────────────
create policy "lead_sources_org_isolation"
  on public.lead_sources for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Clients ───────────────────────────────────────────────────────
create policy "clients_org_isolation"
  on public.clients for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Leads ─────────────────────────────────────────────────────────
create policy "leads_org_isolation"
  on public.leads for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Suppliers ─────────────────────────────────────────────────────
create policy "suppliers_org_isolation"
  on public.suppliers for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Proposals ─────────────────────────────────────────────────────
create policy "proposals_org_isolation"
  on public.proposals for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Contracts ─────────────────────────────────────────────────────
create policy "contracts_org_isolation"
  on public.contracts for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Financial Entries ─────────────────────────────────────────────
create policy "financial_entries_org_isolation"
  on public.financial_entries for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Projects ──────────────────────────────────────────────────────
create policy "projects_org_isolation"
  on public.projects for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Purchases ─────────────────────────────────────────────────────
create policy "purchases_org_isolation"
  on public.purchases for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Works ─────────────────────────────────────────────────────────
create policy "works_org_isolation"
  on public.works for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Tasks ─────────────────────────────────────────────────────────
create policy "tasks_org_isolation"
  on public.tasks for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- ── Notifications ─────────────────────────────────────────────────
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid());

create policy "notifications_insert_org"
  on public.notifications for insert
  with check (organization_id in (select get_my_org_ids()));

-- ── Organization Settings ─────────────────────────────────────────
create policy "org_settings_org_isolation"
  on public.organization_settings for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
