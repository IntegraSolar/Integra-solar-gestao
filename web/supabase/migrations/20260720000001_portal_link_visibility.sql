-- Permite ocultar seções do Portal do Cliente por link.
-- Default true: links existentes seguem mostrando tudo, como hoje.

ALTER TABLE public.client_portal_links
  ADD COLUMN IF NOT EXISTS show_progress boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_history  boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.client_portal_links.show_progress IS
  'Exibe o card "Andamento do Projeto" no portal do cliente.';
COMMENT ON COLUMN public.client_portal_links.show_history IS
  'Exibe o card "Histórico do Projeto" no portal do cliente.';
