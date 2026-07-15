-- Fundação Simuladores: flag de habilitação por empresa (gating do setor).
-- Aditiva e reversível. Default false = ninguém tem acesso até o backoffice ligar.
-- Não afeta nenhuma tabela/coluna existente nem a RLS.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS simuladores_habilitado boolean NOT NULL DEFAULT false;
