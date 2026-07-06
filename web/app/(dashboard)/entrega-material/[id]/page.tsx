// web/app/(dashboard)/entrega-material/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getEntregaMaterialById } from '@/lib/entrega-material/queries'
import EntregaMaterialDetail from './EntregaMaterialDetail'

export default async function EntregaMaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entrega = await getEntregaMaterialById(id)
  if (!entrega) notFound()
  return <EntregaMaterialDetail entrega={entrega} clientId={id} />
}
