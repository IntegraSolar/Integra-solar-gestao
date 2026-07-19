export const metadata = { title: 'Levantamento de cargas' }
import { redirect } from 'next/navigation'
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import {
  listCargasBiblioteca, seedCargasBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'
import { CargasBuilder } from '@/components/simuladores/CargasBuilder'

export default async function CargasPage() {
  if (!(await isSimuladoresEnabled())) redirect('/simuladores')

  // Seed no primeiro acesso: se a empresa ainda não tem biblioteca, popula do padrão.
  let biblioteca = await listCargasBiblioteca()
  if (biblioteca.length === 0) {
    await seedCargasBiblioteca()
    biblioteca = await listCargasBiblioteca()
  }
  return <CargasBuilder biblioteca={biblioteca} />
}
