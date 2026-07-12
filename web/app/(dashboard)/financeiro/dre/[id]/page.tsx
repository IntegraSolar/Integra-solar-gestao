import { getDREByClient } from '@/lib/financeiro/dre-queries'
import { getCurrentUserData } from '@/lib/org/queries'
import { redirect, notFound } from 'next/navigation'
import DREClient from './DREClient'

export default async function DREPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const data = await getDREByClient(id)
  if (!data) notFound()

  return <DREClient data={data} />
}
