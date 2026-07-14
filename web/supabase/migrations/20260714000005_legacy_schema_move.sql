-- M3 (fase 1, REVERSÍVEL): move o schema legado morto para fora do `public`.
--
-- Tabelas legadas nunca lidas/escritas pelo app atual (que usa as equivalentes
-- client_*): contracts, projects, works, purchases, financial_entries.
-- Confirmado: 0 referências no código; nenhuma tabela/view/função ativa depende
-- delas (só FKs internas entre elas). Mover para o schema `legacy` as remove da
-- API PostgREST e do app, PRESERVANDO os dados — totalmente reversível.
--
-- Rodar no SQL Editor. O DROP definitivo é a fase 2 (ver comentário ao final),
-- só depois de confirmar produção estável e com backup.

CREATE SCHEMA IF NOT EXISTS legacy;

-- As FKs internas (works->projects, financial_entries->contracts) são
-- preservadas automaticamente ao mover ambos os lados para `legacy`.
ALTER TABLE IF EXISTS public.works             SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.financial_entries SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.purchases         SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.projects          SET SCHEMA legacy;
ALTER TABLE IF EXISTS public.contracts         SET SCHEMA legacy;

-- Conferir:  SELECT table_name FROM information_schema.tables WHERE table_schema = 'legacy';
--
-- ─────────────────────────────────────────────────────────────────────────
-- REVERTER (se algo inesperado quebrar):
--   ALTER TABLE legacy.contracts         SET SCHEMA public;
--   ALTER TABLE legacy.projects          SET SCHEMA public;
--   ALTER TABLE legacy.purchases         SET SCHEMA public;
--   ALTER TABLE legacy.financial_entries SET SCHEMA public;
--   ALTER TABLE legacy.works             SET SCHEMA public;
--
-- FASE 2 (DEFINITIVA / IRREVERSÍVEL) — só depois de dias de produção estável e
-- com backup do Supabase feito:
--   DROP SCHEMA legacy CASCADE;
-- ─────────────────────────────────────────────────────────────────────────
