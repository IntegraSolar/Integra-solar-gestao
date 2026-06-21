-- web/supabase/migrations/20260618000003_contratos_financeiro.sql
-- Adiciona coluna status em client_contracts para rastreamento no módulo Contratos

alter table public.client_contracts
  add column if not exists status text not null default 'aguardando_assinatura';
