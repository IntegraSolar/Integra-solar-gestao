import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

/**
 * Retorna true se a organização do usuário atual tem os Simuladores habilitados.
 * Isolado de propósito: NÃO altera getCurrentUserData (caminho crítico). Qualquer
 * erro (inclusive coluna ausente antes da migration) resulta em false — fail-closed.
 */
export async function isSimuladoresEnabled(): Promise<boolean> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return false
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('organizations')
      .select('simuladores_habilitado')
      .eq('id', orgId)
      .maybeSingle()
    if (error) return false
    return (data as { simuladores_habilitado?: boolean } | null)?.simuladores_habilitado === true
  } catch {
    return false
  }
}
