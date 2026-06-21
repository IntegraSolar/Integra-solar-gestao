-- web/supabase/migrations/20260618000004_projetos_compras_comissoes.sql

-- Projetos
create table public.client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  numero_processo text,
  data_protocolo date,
  prazo_protocolo date,
  data_solicitacao_vistoria date,
  prazo_vistoria date,
  status text not null default 'pendente',
  checklist jsonb not null default '{"memorial_calculo": false, "art": false, "homologacao": false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_projects enable row level security;
create policy "projetos_org_isolation" on public.client_projects
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Compras
create table public.client_purchases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  fornecedor text,
  itens text,
  valor numeric(12,2),
  data_prevista date,
  status text not null default 'aguardando',
  nf_url text,
  comprovante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_purchases enable row level security;
create policy "purchases_org_isolation" on public.client_purchases
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Comissões
create table public.client_commissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  vendedor_id uuid references public.profiles(id) on delete set null,
  valor_comissao numeric(12,2) not null,
  status text not null default 'pendente',
  paid_at timestamptz,
  comprovante_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_commissions enable row level security;
create policy "commissions_org_isolation" on public.client_commissions
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
