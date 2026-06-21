import { getPosObras } from '@/lib/pos-obra/queries'
import PosObraClientComponent from './PosObraClient'

export default async function PosObraPage() {
  const posObras = await getPosObras()
  return <PosObraClientComponent posObras={posObras} />
}
