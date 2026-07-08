-- Auth security: user_sessions + login_attempts

-- Tabela de sessões ativas dos usuários
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_token   text NOT NULL UNIQUE,
  device_name     text,
  browser         text,
  os              text,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id   ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token     ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires   ON public.user_sessions(expires_at);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Permite service_role inserir sessões
CREATE POLICY "service_insert_sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (true);

-- Tabela de tentativas de login (para proteção brute-force sem Redis)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,        -- email ou IP
  kind       text NOT NULL DEFAULT 'email',  -- 'email' | 'ip'
  success    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_id_time ON public.login_attempts(identifier, created_at);

-- Limpeza automática de tentativas > 24h (via função)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void LANGUAGE sql AS $$
  DELETE FROM public.login_attempts WHERE created_at < now() - interval '24 hours';
$$;
