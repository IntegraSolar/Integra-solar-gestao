import { getDRESummary } from '@/lib/financeiro/dre-queries'
import { getCurrentUserData } from '@/lib/org/queries'
import { redirect } from 'next/navigation'
import DRESummaryClient from './DRESummaryClient'

export default async function DRESummaryPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const summary = await getDRESummary()
  return <DRESummaryClient summary={summary} />
}
