-- O DEFAULT da coluna blocos vinha preenchido com a lista da Fase 1. Como
-- normalizarConfig() só usa os blocos do template quando a lista está vazia, o
-- default sobrepunha o template: escolher "Luxury" renderizava os blocos antigos.
--
-- Lista vazia passa a significar "não personalizado — use os blocos do template".
-- Quando o usuário personaliza pelo configurador, a lista vai preenchida e vence.

ALTER TABLE public.proposal_presentations
  ALTER COLUMN blocos SET DEFAULT '[]'::jsonb;

-- Linhas que ainda carregam exatamente o default antigo não foram personalizadas
-- por ninguém (o configurador é de hoje), então voltam a seguir o template.
UPDATE public.proposal_presentations
SET blocos = '[]'::jsonb
WHERE blocos = '["cover","resumo","sistema","equipamentos","condicoes","contato"]'::jsonb;
