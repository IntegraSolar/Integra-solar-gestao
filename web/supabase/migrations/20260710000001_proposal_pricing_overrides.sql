-- Salva os overrides de variáveis usados na última geração de cada proposta
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS pricing_overrides jsonb;

COMMENT ON COLUMN proposals.pricing_overrides IS 'Snapshot das variáveis de precificação usadas na última geração (valor_instalacao_por_placa, valor_projeto_por_kwp, pct_material_ca, quilometragem, pct_comissao, pct_imposto, pct_margem)';
