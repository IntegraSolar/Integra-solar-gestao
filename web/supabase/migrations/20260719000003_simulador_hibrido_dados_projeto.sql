-- Dados descritivos do projeto, exigidos pelo Memorial descritivo (Fase 4).
-- Nenhum deles entra em cálculo: o desvio da condição ótima já entra como
-- perda por orientação, digitada diretamente na tela.
--
-- Ficam em colunas (e não no snapshot) de propósito: incluí-los em
-- CamposHibrido obrigaria o schema Zod do snapshot a acompanhar, e os
-- snapshots versao:1 já salvos deixariam de validar, tornando simulações
-- antigas irreabríveis.
ALTER TABLE simulador_hibrido_simulacoes
  ADD COLUMN IF NOT EXISTS azimute         numeric,
  ADD COLUMN IF NOT EXISTS inclinacao      numeric,
  ADD COLUMN IF NOT EXISTS latitude        numeric,
  ADD COLUMN IF NOT EXISTS longitude       numeric,
  ADD COLUMN IF NOT EXISTS altitude        numeric,
  ADD COLUMN IF NOT EXISTS tipo_ligacao    text,
  ADD COLUMN IF NOT EXISTS tensao_nominal  numeric,
  ADD COLUMN IF NOT EXISTS modo_operacao   text;
