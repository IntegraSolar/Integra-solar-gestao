export const metadata = { title: 'Cadastro de equipamentos' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { listPaineis, listInversores, listBaterias } from '@/lib/simuladores/equipamentos/equipamentos-actions'
import { EquipamentosManager } from '@/components/simuladores/EquipamentosManager'

export default async function EquipamentosPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')
  const [paineis, inversores, baterias] = await Promise.all([listPaineis(), listInversores(), listBaterias()])
  return <EquipamentosManager paineis={paineis} inversores={inversores} baterias={baterias} />
}
