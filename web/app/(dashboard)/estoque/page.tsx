import { getStockItems } from '@/lib/estoque/queries'
import EstoqueClient from './EstoqueClient'

export default async function EstoquePage() {
  const items = await getStockItems()
  return <EstoqueClient initialItems={items} />
}
