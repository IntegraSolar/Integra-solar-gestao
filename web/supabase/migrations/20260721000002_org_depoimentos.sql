-- Depoimentos de clientes, exibidos opcionalmente na apresentação comercial.
CREATE TABLE IF NOT EXISTS public.org_depoimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  autor text NOT NULL,
  cidade text,
  texto text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_depoimentos_org ON public.org_depoimentos(organization_id);

ALTER TABLE public.org_depoimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage depoimentos"
  ON public.org_depoimentos FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
