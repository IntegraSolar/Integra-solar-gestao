export const metadata = { title: 'Híbrido / Off-grid' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import {
  listPaineis, listInversores, listBaterias,
} from '@/lib/simuladores/equipamentos/equipamentos-actions'
import {
  listCargasBiblioteca, seedCargasBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'
import { listSimulacoesHibrido } from '@/lib/simuladores/hibrido/simulacoes-actions'
import { SimuladorHibrido } from '@/components/simuladores/SimuladorHibrido'
import { getEmpresaParaProposta } from '@/lib/simuladores/proposta-empresa'

export default async function HibridoOffgridPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')

  const [paineis, inversores, baterias, simulacoes, empresa] = await Promise.all([
    listPaineis(), listInversores(), listBaterias(), listSimulacoesHibrido(), getEmpresaParaProposta(),
  ])

  // Seed no primeiro acesso, mesmo comportamento da tela de cargas.
  let biblioteca = await listCargasBiblioteca()
  if (biblioteca.length === 0) {
    await seedCargasBiblioteca()
    biblioteca = await listCargasBiblioteca()
  }

  return (
    <SimuladorHibrido
      equipamentos={{ paineis, inversores, baterias }}
      biblioteca={biblioteca}
      simulacoes={simulacoes}
      empresa={empresa}
    />
  )
}
