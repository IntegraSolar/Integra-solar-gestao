// web/app/(dashboard)/pos-obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getPosObraById } from '@/lib/pos-obra/queries'
import PosObraDetail from './PosObraDetail'

export default async function PosObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const posObra = await getPosObraById(id)
  if (!posObra) notFound()
  return <PosObraDetail posObra={posObra} clientId={id} />
}
