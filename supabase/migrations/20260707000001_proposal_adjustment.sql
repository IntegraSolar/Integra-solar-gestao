-- Adiciona suporte a Ajuste Comercial na tabela proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS preco_calculado      numeric(15,2),
  ADD COLUMN IF NOT EXISTS ajuste_tipo          text CHECK (ajuste_tipo IN ('percentual','valor','valor_final')),
  ADD COLUMN IF NOT EXISTS ajuste_valor         numeric(15,2),
  ADD COLUMN IF NOT EXISTS ajuste_percentual    numeric(6,4),
  ADD COLUMN IF NOT EXISTS ajuste_motivo        text,
  ADD COLUMN IF NOT EXISTS ajuste_aplicado_por  uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS ajuste_aplicado_em   timestamptz,
  ADD COLUMN IF NOT EXISTS preco_final          numeric(15,2);

-- Retrocompatibilidade: propostas existentes sem ajuste têm preco_final = preco_total
UPDATE public.proposals
  SET preco_calculado = preco_total,
      preco_final     = preco_total
  WHERE preco_total IS NOT NULL AND preco_final IS NULL;

COMMENT ON COLUMN public.proposals.preco_calculado IS 'Valor calculado pela engine antes de qualquer ajuste comercial';
COMMENT ON COLUMN public.proposals.preco_final IS 'Valor final após ajuste comercial (= preco_calculado quando sem ajuste)';
