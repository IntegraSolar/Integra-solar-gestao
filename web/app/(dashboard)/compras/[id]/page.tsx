// web/app/(dashboard)/compras/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getCompraById } from '@/lib/compras/queries'
import CompraDetail from './CompraDetail'

export default async function CompraDetailPage({ params }: { params: { id: string } }) {
  const compra = await getCompraById(params.id)
  if (!compra) notFound()
  return <CompraDetail compra={compra} clientId={params.id} />
}
