-- Link público da proposta comercial. Mesmo padrão de client_portal_links.
CREATE TABLE IF NOT EXISTS public.proposal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposal_links_token ON public.proposal_links(token);
CREATE INDEX IF NOT EXISTS idx_proposal_links_proposal ON public.proposal_links(proposal_id);

ALTER TABLE public.proposal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage proposal links"
  ON public.proposal_links FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
