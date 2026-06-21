-- web/supabase/migrations/20260618000005_entrega_obra_pos_obra.sql

-- Entrega do Material
create table public.client_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_entrega date,
  termo_url text,
  checklist jsonb not null default '{"limpeza": false, "manuais": false, "orientacao_uso": false}',
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_deliveries enable row level security;
create policy "deliveries_org_isolation" on public.client_deliveries
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Obra
create table public.client_obras (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_inicio date,
  data_prevista date,
  status text not null default 'aguardando',
  responsavel_id uuid references public.profiles(id) on delete set null,
  equipe_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_obras enable row level security;
create policy "obras_org_isolation" on public.client_obras
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Entrega da Obra
create table public.client_obra_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_entrega date,
  termo_url text,
  observacoes text,
  checklist jsonb not null default '{"vistoria": false, "fotos": false, "cliente_ok": false}',
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_obra_deliveries enable row level security;
create policy "obra_deliveries_org_isolation" on public.client_obra_deliveries
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));

-- Pós Obra
create table public.client_pos_obra (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  data_contato date,
  nps integer,
  observacoes text,
  status text not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_pos_obra enable row level security;
create policy "pos_obra_org_isolation" on public.client_pos_obra
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
