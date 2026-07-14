-- Performance da busca textual de clientes (A1).
-- A busca usa ILIKE '%termo%' (wildcard à esquerda), que NÃO usa índice btree
-- comum → seq scan. Com pg_trgm + índices GIN, o ILIKE passa a usar índice,
-- mantendo a busca rápida mesmo com milhares de clientes por empresa.
--
-- Idempotente. Rodar no SQL Editor do Supabase (DDL não passa pelo PostgREST).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON public.clients USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_email_trgm
  ON public.clients USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_phone_trgm
  ON public.clients USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj_trgm
  ON public.clients USING gin (cpf_cnpj gin_trgm_ops);

-- city já tem btree (idx_clients_city); o trigram ajuda no ILIKE parcial.
CREATE INDEX IF NOT EXISTS idx_clients_city_trgm
  ON public.clients USING gin (city gin_trgm_ops);
