export const metadata = { title: 'Parcelamento no cartão' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listCartaoTabelas } from '@/lib/simuladores/cartao/tabelas-actions'
import { getEmpresaParaProposta } from '@/lib/simuladores/viabilidade/proposta-empresa'
import { SimuladorCartao } from '@/components/simuladores/SimuladorCartao'

export default async function ParcelamentoCartaoPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const [tabelas, empresa] = await Promise.all([listCartaoTabelas(), getEmpresaParaProposta()])
  return <SimuladorCartao tabelas={tabelas} empresa={empresa} />
}
