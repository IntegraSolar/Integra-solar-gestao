-- Configuração padrão da apresentação comercial, por empresa.
--
-- Define o ponto de partida de toda proposta nova: modelo, tema, quais blocos
-- e os textos que hoje estão fixos no código (garantias, etapas, como funciona).
-- O vendedor ainda pode trocar modelo e tema numa proposta específica.
--
-- `blocos` vazio significa "usar os blocos do modelo escolhido".
-- `textos` vazio significa "usar os textos padrão do sistema" — cada chave
-- ausente cai no padrão individualmente, então a empresa personaliza só o que quer.

CREATE TABLE IF NOT EXISTS public.org_apresentacao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  template text NOT NULL DEFAULT 'premium',
  tema text NOT NULL DEFAULT 'minimal-white',
  blocos jsonb NOT NULL DEFAULT '[]'::jsonb,
  textos jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_apresentacao_config_org
  ON public.org_apresentacao_config(organization_id);

ALTER TABLE public.org_apresentacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage apresentacao config"
  ON public.org_apresentacao_config FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Bucket público para a logomarca: ela aparece na apresentação, que é acessada
-- por link sem login. Um bucket privado exigiria URL assinada a cada visita.
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-branding', 'org-branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "org members upload branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members update branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members delete branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "anyone can read branding"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'org-branding');
