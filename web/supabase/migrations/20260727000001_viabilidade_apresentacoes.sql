-- Apresentação (proposta comercial) de uma simulação de viabilidade de usina.
--
-- Guarda um SNAPSHOT do input e do resultado, não uma referência à simulação
-- salva: o link precisa sobreviver à exclusão da simulação na lista, e o
-- investidor deve ver exatamente o que foi gerado no momento.
CREATE TABLE IF NOT EXISTS public.simulador_viabilidade_apresentacoes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token                text NOT NULL UNIQUE,
  cliente_nome         text,
  cliente_cidade       text,
  concessionaria_nome  text NOT NULL,
  modelo_painel        text,
  modelo_inversor      text,
  input                jsonb NOT NULL,   -- snapshot do ViabilidadeInput
  resultado            jsonb NOT NULL,   -- snapshot do ViabilidadeResultado
  active               boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viab_apres_org
  ON public.simulador_viabilidade_apresentacoes(organization_id);
CREATE INDEX IF NOT EXISTS idx_viab_apres_token
  ON public.simulador_viabilidade_apresentacoes(token) WHERE active;

ALTER TABLE public.simulador_viabilidade_apresentacoes ENABLE ROW LEVEL SECURITY;

-- Membros da org gerenciam as próprias. A LEITURA PÚBLICA (investidor sem login)
-- é feita pela rota via service-role, que ignora RLS — como em /api/proposta.
CREATE POLICY "org members manage viab apresentacoes"
  ON public.simulador_viabilidade_apresentacoes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
