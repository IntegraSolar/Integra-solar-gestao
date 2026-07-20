export const metadata = { title: 'Híbrido / Off-grid' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import {
  listPaineis, listInversores, listBaterias,
} from '@/lib/simuladores/equipamentos/equipamentos-actions'
import {
  listCargasBiblioteca, seedCargasBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'
import { SimuladorHibrido } from '@/components/simuladores/SimuladorHibrido'

export default async function HibridoOffgridPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')

  const [paineis, inversores, baterias] = await Promise.all([
    listPaineis(), listInversores(), listBaterias(),
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
      simulacoes={[]}
    />
  )
}
