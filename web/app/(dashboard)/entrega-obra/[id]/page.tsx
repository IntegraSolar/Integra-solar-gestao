// web/app/(dashboard)/entrega-obra/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getEntregaObraById } from '@/lib/entrega-obra/queries'
import EntregaObraDetail from './EntregaObraDetail'

export default async function EntregaObraDetailPage({ params }: { params: { id: string } }) {
  const entrega = await getEntregaObraById(params.id)
  if (!entrega) notFound()
  return <EntregaObraDetail entrega={entrega} clientId={params.id} />
}
