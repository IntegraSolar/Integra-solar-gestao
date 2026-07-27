export const metadata = { title: 'Viabilidade de usina' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listConcessionariasConfiguradas } from '@/lib/simuladores/viabilidade/concessionarias-actions'
import { listSimulacoes } from '@/lib/simuladores/viabilidade/simulacoes-actions'
import { getEmpresaParaProposta } from '@/lib/simuladores/proposta-empresa'
import { SimuladorViabilidade } from '@/components/simuladores/SimuladorViabilidade'

export default async function ViabilidadePage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const [concessionarias, simulacoes, empresa] = await Promise.all([
    listConcessionariasConfiguradas(),
    listSimulacoes(),
    getEmpresaParaProposta(),
  ])
  return <SimuladorViabilidade concessionarias={concessionarias} simulacoes={simulacoes} empresa={empresa} />
}
