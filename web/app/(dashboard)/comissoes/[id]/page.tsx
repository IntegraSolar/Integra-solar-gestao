// web/app/(dashboard)/comissoes/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getComissaoById } from '@/lib/comissoes/queries'
import ComissaoDetail from './ComissaoDetail'

export default async function ComissaoDetailPage({ params }: { params: { id: string } }) {
  const comissao = await getComissaoById(params.id)
  if (!comissao) notFound()
  return <ComissaoDetail comissao={comissao} />
}
