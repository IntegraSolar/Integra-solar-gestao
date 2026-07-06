// web/app/(dashboard)/compras/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getCompraById } from '@/lib/compras/queries'
import CompraDetail from './CompraDetail'

export default async function CompraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const compra = await getCompraById(id)
  if (!compra) notFound()
  return <CompraDetail compra={compra} clientId={id} />
}
