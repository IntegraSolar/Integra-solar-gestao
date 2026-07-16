export const metadata = { title: 'Concessionárias — Viabilidade' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listConcessionarias, seedConcessionarias } from '@/lib/simuladores/viabilidade/concessionarias-actions'
import { ConcessionariasManager } from '@/components/simuladores/ConcessionariasManager'

export default async function ConcessionariasPage() {
  const enabled = await isSimuladoresEnabled()
  if (!enabled) redirect('/simuladores')

  // Seed no primeiro acesso: se a empresa ainda não tem nenhuma, popula do padrão.
  let lista = await listConcessionarias()
  if (lista.length === 0) {
    await seedConcessionarias()
    lista = await listConcessionarias()
  }
  return <ConcessionariasManager inicial={lista} />
}
