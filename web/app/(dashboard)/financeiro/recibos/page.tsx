import { getAllReceipts } from '@/lib/financeiro/receipt-actions'
import { getCurrentUserData } from '@/lib/org/queries'
import { redirect } from 'next/navigation'
import RecibosClient from './RecibosClient'

export default async function RecibosPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const receipts = await getAllReceipts()
  return <RecibosClient receipts={receipts} />
}
