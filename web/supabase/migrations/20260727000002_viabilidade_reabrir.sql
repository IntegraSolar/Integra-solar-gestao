-- Reabrir a simulação e acessar a proposta a partir da lista de salvas.
--
-- modelo_painel/modelo_inversor: texto livre da tela, não vive no ViabilidadeInput.
-- Sem eles, reabrir e a proposta perdiam o modelo dos equipamentos.
-- apresentacao_token: liga a simulação à sua apresentação comercial, para o
-- botão "Proposta" reabrir o mesmo link em vez de gerar uma proposta nova a cada clique.
ALTER TABLE public.simulador_viabilidade
  ADD COLUMN IF NOT EXISTS modelo_painel text,
  ADD COLUMN IF NOT EXISTS modelo_inversor text,
  ADD COLUMN IF NOT EXISTS apresentacao_token text;
