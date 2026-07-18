export const metadata = { title: 'Tabelas de cartão' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listCartaoTabelas } from '@/lib/simuladores/cartao/tabelas-actions'
import { CartaoTabelasManager } from '@/components/simuladores/CartaoTabelasManager'

export default async function CartaoTabelasPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const tabelas = await listCartaoTabelas()
  return <CartaoTabelasManager inicial={tabelas} />
}
