// web/app/(dashboard)/obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getObraById, getObraMembers } from '@/lib/obra/queries'
import ObraDetail from './ObraDetail'

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [obra, members] = await Promise.all([getObraById(id), getObraMembers()])
  if (!obra) notFound()
  return <ObraDetail obra={obra} members={members} clientId={id} />
}
