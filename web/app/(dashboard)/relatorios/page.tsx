export const metadata = { title: "Relatórios" }
import { requireModuleAccess } from '@/lib/org/permissions'
import RelatoriosClient from './RelatoriosClient'

export default async function RelatoriosPage() {
  await requireModuleAccess('relatorios')
  return <RelatoriosClient />
}
