// web/app/(dashboard)/obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getObraById, getObraMembers } from '@/lib/obra/queries'
import ObraDetail from './ObraDetail'

export default async function ObraDetailPage({ params }: { params: { id: string } }) {
  const [obra, members] = await Promise.all([getObraById(params.id), getObraMembers()])
  if (!obra) notFound()
  return <ObraDetail obra={obra} members={members} clientId={params.id} />
}
