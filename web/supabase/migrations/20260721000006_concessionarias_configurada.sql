-- "Configurada": marca quais concessionárias a empresa escolheu para aparecer
-- no seletor do simulador de Viabilidade.
--
-- Antes, todas as ~29 concessionárias semeadas apareciam no seletor de uma vez,
-- poluindo a escolha. Agora o catálogo completo fica na tela de gestão e a
-- empresa liga só as que atende.
--
-- DEFAULT false: começam todas desmarcadas, inclusive as já semeadas. O modelo
-- é opt-in — a empresa abre a gestão e marca as suas. (Decisão do produto:
-- começar limpo em vez de herdar as 29 marcadas.)

ALTER TABLE public.simulador_concessionarias
  ADD COLUMN IF NOT EXISTS configurada boolean NOT NULL DEFAULT false;

-- O seletor da viabilidade filtra por (organization_id, configurada).
CREATE INDEX IF NOT EXISTS idx_simulador_concessionarias_configurada
  ON public.simulador_concessionarias(organization_id, configurada);
