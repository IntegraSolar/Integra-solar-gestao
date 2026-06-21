import { getEntregasObra } from '@/lib/entrega-obra/queries'
import EntregaObraClientComponent from './EntregaObraClient'

export default async function EntregaObraPage() {
  const entregas = await getEntregasObra()
  return <EntregaObraClientComponent entregas={entregas} />
}
