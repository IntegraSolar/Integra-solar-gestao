-- ═══════════════════════════════════════════════════════════════════
-- Integra Solar CRM — Fase 1 Backoffice
-- Schema platform: usuários administrativos da Integra Solar
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS platform;

-- Usuários internos da Integra Solar (não são clientes)
CREATE TABLE IF NOT EXISTS platform.platform_users (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text        UNIQUE NOT NULL,
  password_hash  text        NOT NULL,
  name           text        NOT NULL,
  role           text        NOT NULL DEFAULT 'support'
                             CHECK (role IN ('super_admin','admin','support')),
  is_active      boolean     NOT NULL DEFAULT true,
  last_login_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Logs de auditoria das ações do backoffice
CREATE TABLE IF NOT EXISTS platform.audit_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id uuid        REFERENCES platform.platform_users(id) ON DELETE SET NULL,
  action           text        NOT NULL,
  target_type      text,
  target_id        text,
  metadata         jsonb,
  ip_address       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Configurações globais do sistema
CREATE TABLE IF NOT EXISTS platform.system_settings (
  key         text        PRIMARY KEY,
  value       jsonb       NOT NULL,
  updated_by  uuid        REFERENCES platform.platform_users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── RPC pública para verificar credenciais (hash nunca sai do DB) ──
-- Exposta via PostgREST pois está no schema public, mas acessa platform
-- com SECURITY DEFINER — seguro pois nunca retorna password_hash.
CREATE OR REPLACE FUNCTION public.verify_platform_user(p_email text, p_password text)
RETURNS TABLE(id uuid, email text, name text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, platform, public
AS $$
DECLARE
  v_user platform.platform_users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM platform.platform_users
  WHERE platform.platform_users.email = lower(p_email)
    AND platform.platform_users.is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    UPDATE platform.platform_users
       SET last_login_at = now()
     WHERE platform.platform_users.id = v_user.id;

    RETURN QUERY
      SELECT v_user.id, v_user.email, v_user.name, v_user.role;
  END IF;
END;
$$;

-- ── Primeiro usuário super_admin ───────────────────────────────────
-- Senha padrão: Admin@Integra2026 — deve ser alterada após primeiro acesso
INSERT INTO platform.platform_users (email, password_hash, name, role)
VALUES (
  'admin@integrasolar.app.br',
  extensions.crypt('Admin@Integra2026', extensions.gen_salt('bf', 12)),
  'Administrador',
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;
