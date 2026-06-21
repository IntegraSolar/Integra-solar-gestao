-- web/supabase/migrations/20260618000001_crm_additions.sql
-- ─────────────────────────────────────────────────────────────────
-- CRM additions: missing lead columns, lead_notes, proposal tweaks
-- Apply via: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- Adicionar colunas faltando em leads
alter table public.leads add column if not exists address text;
alter table public.leads add column if not exists avg_kwh numeric;
alter table public.leads add column if not exists installation_type text;
alter table public.leads add column if not exists converted boolean not null default false;
alter table public.leads add column if not exists converted_to_client_id uuid references public.clients(id) on delete set null;

-- Adicionar flags de terminal nas etapas do funil
alter table public.pipeline_stages add column if not exists is_terminal_won boolean not null default false;
alter table public.pipeline_stages add column if not exists is_terminal_lost boolean not null default false;

-- Adicionar nome e brand/model nas propostas
alter table public.proposals add column if not exists name text not null default 'Proposta';
alter table public.proposals add column if not exists panel_brand_model text;
alter table public.proposals add column if not exists inverter_brand_model text;
-- Tornar client_id nullable (proposta pode existir antes da conversão)
alter table public.proposals alter column client_id drop not null;

-- Tabela de notas de lead
create table if not exists public.lead_notes (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by      uuid references public.profiles(id) on delete set null,
  content         text not null,
  created_at      timestamptz not null default now()
);
create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id);
alter table public.lead_notes enable row level security;
create policy "lead_notes_org_isolation" on public.lead_notes for all
  using (organization_id in (select get_my_org_ids()))
  with check (organization_id in (select get_my_org_ids()));
