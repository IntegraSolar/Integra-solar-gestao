// web/app/(dashboard)/pos-obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getPosObraById } from '@/lib/pos-obra/queries'
import PosObraDetail from './PosObraDetail'

export default async function PosObraDetailPage({ params }: { params: { id: string } }) {
  const posObra = await getPosObraById(params.id)
  if (!posObra) notFound()
  return <PosObraDetail posObra={posObra} clientId={params.id} />
}
