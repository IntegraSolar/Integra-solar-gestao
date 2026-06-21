-- web/supabase/migrations/20260618000006_configuracoes.sql

-- org_config: flat config table, one row per organization
create table public.org_config (
  id                         uuid primary key default gen_random_uuid(),
  organization_id            uuid not null unique references public.organizations(id) on delete cascade,
  -- Dados da empresa
  razao_social               text,
  nome_fantasia              text,
  cnpj                       text,
  email                      text,
  telefone                   text,
  cep                        text,
  endereco                   text,
  bairro                     text,
  numero                     text,
  cidade                     text,
  estado                     text,
  cor_principal              text default '#FFD080',
  cor_secundaria             text default '#0a0e1a',
  concessionaria             text,
  logo_url                   text,
  -- Dados bancários
  banco                      text,
  agencia                    text,
  conta                      text,
  tipo_chave_pix             text,
  pix                        text,
  -- Dados de cálculo
  kwh_por_kwp                numeric(10,4),
  valor_projeto_por_kwp      numeric(12,2),
  valor_instalacao_por_placa numeric(12,2),
  pct_material_ca            numeric(6,2),
  quilometragem              numeric(10,2),
  pct_comissao               numeric(6,2),
  pct_imposto                numeric(6,2),
  pct_margem                 numeric(6,2),
  -- Meta
  meta_anual                 numeric(15,2),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
alter table public.org_config enable row level security;
create policy "org_config_isolation" on public.org_config
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- audit_logs
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete set null,
  user_name       text,
  action          text not null,
  description     text,
  created_at      timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit_logs_isolation" on public.audit_logs
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Add permissions column to organization_members
alter table public.organization_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- Extend role check to include new roles
alter table public.organization_members
  drop constraint if exists organization_members_role_check;
alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'gerente', 'vendedor', 'instalador', 'projetista'));
