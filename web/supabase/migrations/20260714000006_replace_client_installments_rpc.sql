-- QA C3: troca das parcelas do cliente de forma ATÔMICA.
-- Antes o código fazia DELETE de todas as parcelas e depois INSERT das novas —
-- se o INSERT falhasse, as parcelas antigas já tinham sido apagadas (perda de
-- dado financeiro). Uma função encapsula delete+insert numa única unidade
-- atômica: se o insert falhar, o delete é revertido automaticamente.
--
-- SECURITY INVOKER (padrão): a RLS de client_installments continua valendo —
-- o usuário só altera parcelas da própria organização. Rodar no SQL Editor.

CREATE OR REPLACE FUNCTION public.replace_client_installments(
  p_client_id uuid,
  p_org uuid,
  p_installments jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.client_installments
  WHERE client_id = p_client_id AND organization_id = p_org;

  INSERT INTO public.client_installments
    (client_id, organization_id, position, due_date, amount, notes)
  SELECT
    p_client_id,
    p_org,
    (e->>'position')::int,
    (e->>'due_date')::date,
    (e->>'amount')::numeric,
    NULLIF(e->>'notes', '')
  FROM jsonb_array_elements(p_installments) AS e;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_client_installments(uuid, uuid, jsonb) TO authenticated;
