export const metadata = { title: 'Simuladores' }
import { isSimuladoresEnabled } from '@/lib/simuladores/access'
import { SimuladoresHub } from '@/components/simuladores/SimuladoresHub'
import { SimuladoresLocked } from '@/components/simuladores/SimuladoresLocked'

export default async function SimuladoresPage() {
  const enabled = await isSimuladoresEnabled()
  return enabled ? <SimuladoresHub /> : <SimuladoresLocked />
}
