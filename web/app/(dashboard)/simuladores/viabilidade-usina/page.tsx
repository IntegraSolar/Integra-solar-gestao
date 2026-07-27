export const metadata = { title: 'Viabilidade de usina' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listConcessionariasConfiguradas } from '@/lib/simuladores/viabilidade/concessionarias-actions'
import { listSimulacoes } from '@/lib/simuladores/viabilidade/simulacoes-actions'
import { SimuladorViabilidade } from '@/components/simuladores/SimuladorViabilidade'

export default async function ViabilidadePage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const [concessionarias, simulacoes] = await Promise.all([
    listConcessionariasConfiguradas(),
    listSimulacoes(),
  ])
  return <SimuladorViabilidade concessionarias={concessionarias} simulacoes={simulacoes} />
}
