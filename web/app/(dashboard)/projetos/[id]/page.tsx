// web/app/(dashboard)/projetos/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getProjetoById, getProjetoMembers } from '@/lib/projetos/queries'
import ProjetoDetail from './ProjetoDetail'

export default async function ProjetoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [projeto, members] = await Promise.all([
    getProjetoById(id),
    getProjetoMembers(),
  ])

  if (!projeto) notFound()

  return <ProjetoDetail projeto={projeto} members={members} clientId={id} />
}
