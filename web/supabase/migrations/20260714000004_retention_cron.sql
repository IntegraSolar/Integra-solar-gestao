-- M2: retenção automática das tabelas que só crescem (evita bloat em escala).
-- 100% no banco, via pg_cron. Rodar no SQL Editor do Supabase.
--
-- Se o CREATE EXTENSION falhar por permissão, habilite o pg_cron antes em:
--   Dashboard > Database > Extensions > pg_cron > Enable.
-- cron.schedule com nome de job é idempotente (re-rodar substitui o job).

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 1) login_attempts: usa a função já existente (apaga > 24h). De hora em hora.
SELECT cron.schedule(
  'cleanup-login-attempts',
  '17 * * * *',
  $$ SELECT public.cleanup_old_login_attempts(); $$
);

-- ── 2) user_sessions: apaga sessões expiradas há mais de 7 dias. Diário.
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.user_sessions
  WHERE expires_at IS NOT NULL AND expires_at < now() - interval '7 days';
$$;

SELECT cron.schedule(
  'cleanup-expired-sessions',
  '23 3 * * *',
  $$ SELECT public.cleanup_expired_sessions(); $$
);

-- ── 3) notifications: apaga apenas notificações JÁ LIDAS com mais de 90 dias.
--    (as não lidas nunca são removidas). Diário.
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.notifications
  WHERE is_read = true AND created_at < now() - interval '90 days';
$$;

SELECT cron.schedule(
  'cleanup-old-notifications',
  '41 3 * * *',
  $$ SELECT public.cleanup_old_notifications(); $$
);

-- ── 4) audit_logs: OPT-IN (retenção de auditoria é decisão de compliance sua).
--    Apagar logs de auditoria é irreversível — defina o período conforme sua
--    política (LGPD/segurança) e só então descomente. Sugestão: 12 meses.
--
-- CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
-- RETURNS void
-- LANGUAGE sql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
--   DELETE FROM public.audit_logs WHERE created_at < now() - interval '12 months';
-- $$;
--
-- SELECT cron.schedule(
--   'cleanup-old-audit-logs',
--   '53 3 * * *',
--   $$ SELECT public.cleanup_old_audit_logs(); $$
-- );

-- Conferir os jobs agendados:  SELECT jobname, schedule, active FROM cron.job;
