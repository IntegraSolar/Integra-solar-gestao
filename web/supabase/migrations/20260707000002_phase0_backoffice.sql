-- ═══════════════════════════════════════════════════════════════════
-- Integra Solar CRM — Fase 0 Backoffice
-- Migração: Estrutura de suporte ao painel administrativo
-- ═══════════════════════════════════════════════════════════════════

-- 1. Soft-delete de colaboradores (tabela real: app_users)
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.app_users.is_active IS 'false = colaborador desativado (soft delete)';

-- Nota: tabela `assinaturas` já possui organization_id e trial_ends_at nativamente.

-- 2. Campos de bloqueio em organizations (para uso do backoffice)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_ends_at  timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_at     timestamptz;

COMMENT ON COLUMN public.organizations.trial_ends_at  IS 'Data de fim do período trial. NULL = sem trial ativo.';
COMMENT ON COLUMN public.organizations.blocked_reason IS 'Motivo do bloqueio manual pela equipe administrativa.';
COMMENT ON COLUMN public.organizations.blocked_at     IS 'Timestamp do bloqueio manual. NULL = não bloqueada.';
