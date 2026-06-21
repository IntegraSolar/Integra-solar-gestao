import { getCompras } from '@/lib/compras/queries'
import ComprasClient from './ComprasClient'

export default async function ComprasPage() {
  const compras = await getCompras()
  return <ComprasClient compras={compras} />
}
