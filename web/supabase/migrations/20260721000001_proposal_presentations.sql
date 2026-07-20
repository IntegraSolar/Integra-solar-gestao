-- Configuração da apresentação comercial de cada proposta.
-- Uma proposta tem no máximo uma configuração; ausente = padrões do código.
CREATE TABLE IF NOT EXISTS public.proposal_presentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL UNIQUE REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template text NOT NULL DEFAULT 'premium',
  tema text NOT NULL DEFAULT 'minimal-white',
  blocos jsonb NOT NULL DEFAULT '["cover","resumo","sistema","equipamentos","condicoes","contato"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_presentations_proposal
  ON public.proposal_presentations(proposal_id);

ALTER TABLE public.proposal_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage presentations"
  ON public.proposal_presentations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
