-- M1: agrega "leads por origem" no BANCO em vez de transferir todos os leads
-- para contar em JS (o dashboard fazia .limit(2000) + count no Node, o que
-- truncava e transferia tudo a cada carga). A função retorna ~N linhas (uma por
-- origem) em vez de milhares.
--
-- SECURITY INVOKER (padrão): a RLS de `leads` continua valendo — o usuário só
-- agrega os leads da própria organização. O filtro por p_org usa o índice.
-- Rodar no SQL Editor do Supabase (DDL não passa pelo PostgREST).

CREATE OR REPLACE FUNCTION public.leads_por_origem(p_org uuid)
RETURNS TABLE (name text, total bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(ls.name, 'Sem origem') AS name, COUNT(*)::bigint AS total
  FROM public.leads l
  LEFT JOIN public.lead_sources ls ON ls.id = l.lead_source_id
  WHERE l.organization_id = p_org
  GROUP BY COALESCE(ls.name, 'Sem origem')
  ORDER BY total DESC;
$$;

GRANT EXECUTE ON FUNCTION public.leads_por_origem(uuid) TO authenticated;
