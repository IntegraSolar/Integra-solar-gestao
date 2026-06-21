-- web/supabase/migrations/20260618000007_estoque.sql

create table public.stock_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  quantity        numeric(12,3) not null default 0,
  unit_value      numeric(12,2) not null default 0,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.stock_items enable row level security;

create policy "stock_items_isolation" on public.stock_items
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
