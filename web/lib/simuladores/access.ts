import { createClient } from '@/lib/supabase/server'
import { getCurrentUserData } from '@/lib/org/queries'

/**
 * Retorna true se a organização do usuário atual tem os Simuladores habilitados.
 * Isolado de propósito: NÃO altera getCurrentUserData (caminho crítico). Qualquer
 * erro (inclusive coluna ausente antes da migration) resulta em false — fail-closed.
 */
/**
 * Org ativa do usuário, desde que a empresa tenha os Simuladores contratados.
 *
 * Usado por todas as server actions de simuladores: sem isto, a proteção viveria
 * só nas páginas e as actions poderiam ser chamadas diretamente por uma empresa
 * sem o plano. Fail-closed, como isSimuladoresEnabled.
 */
export async function requireSimuladoresOrg(): Promise<{ orgId: string } | { error: string }> {
  const user = await getCurrentUserData()
  const orgId = user?.membership?.organization.id
  if (!orgId) return { error: 'Sem organização ativa.' }
  if (!(await isSimuladoresEnabled())) {
    return { error: 'Simuladores não habilitados para esta empresa.' }
  }
  return { orgId }
}

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
