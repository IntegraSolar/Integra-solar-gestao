-- ═══════════════════════════════════════════════════════════════════
-- Integra Solar CRM — Fase 0 Backoffice
-- Migração: Estrutura de suporte ao painel administrativo
-- ═══════════════════════════════════════════════════════════════════

-- 1. Soft-delete de colaboradores
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organization_members.is_active IS 'false = colaborador desativado (soft delete)';

-- 2. Referência direta de subscription para organização
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Migrar dados existentes: preencher organization_id pelo owner da org
UPDATE public.subscriptions s
  SET organization_id = om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = s.user_id
    AND om.role = 'owner'
    AND s.organization_id IS NULL;

COMMENT ON COLUMN public.subscriptions.organization_id IS 'Referência direta à organização — substitui a referência por user_id';

-- 3. Campos de bloqueio em organizations (para uso do backoffice futuramente)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at  timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at     timestamptz;

COMMENT ON COLUMN public.organizations.trial_ends_at  IS 'Data de fim do período trial. NULL = sem trial ativo.';
COMMENT ON COLUMN public.organizations.blocked_reason IS 'Motivo do bloqueio manual pela equipe administrativa.';
COMMENT ON COLUMN public.organizations.blocked_at     IS 'Timestamp do bloqueio manual. NULL = não bloqueada.';
