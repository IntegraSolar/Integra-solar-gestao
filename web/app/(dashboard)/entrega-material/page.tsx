export const metadata = { title: "Entrega de Material" }
import { getEntregasMaterial } from '@/lib/entrega-material/queries'
import EntregaMaterialClientComponent from './EntregaMaterialClient'

export default async function EntregaMaterialPage() {
  const entregas = await getEntregasMaterial()
  return <EntregaMaterialClientComponent entregas={entregas} />
}
