// web/app/(dashboard)/comissoes/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getComissaoById } from '@/lib/comissoes/queries'
import ComissaoDetail from './ComissaoDetail'

export default async function ComissaoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comissao = await getComissaoById(id)
  if (!comissao) notFound()
  return <ComissaoDetail comissao={comissao} />
}
