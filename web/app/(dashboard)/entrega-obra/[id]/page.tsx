// web/app/(dashboard)/entrega-obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getEntregaObraById } from '@/lib/entrega-obra/queries'
import { getObraPhotos } from '@/lib/entrega-obra/actions'
import EntregaObraDetail from './EntregaObraDetail'

export default async function EntregaObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entrega = await getEntregaObraById(id)
  if (!entrega) notFound()
  const photos = await getObraPhotos(entrega.id)
  return <EntregaObraDetail entrega={entrega} clientId={id} initialPhotos={photos} />
}
