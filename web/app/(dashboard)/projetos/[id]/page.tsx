// web/app/(dashboard)/projetos/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getProjetoById, getProjetoMembers } from '@/lib/projetos/queries'
import { getProjectAttachments, getProjetistaLink } from '@/lib/projetos/actions'
import { getClientPortalLink } from '@/lib/clients/portal-actions'
import ProjetoDetail from './ProjetoDetail'

export default async function ProjetoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [projeto, members] = await Promise.all([
    getProjetoById(id),
    getProjetoMembers(),
  ])

  if (!projeto) notFound()

  const [attachments, projetistaLink, portalLink] = await Promise.all([
    getProjectAttachments(projeto.id),
    getProjetistaLink(id),
    getClientPortalLink(id),
  ])

  return <ProjetoDetail projeto={projeto} members={members} clientId={id} initialAttachments={attachments} initialProjetistaToken={projetistaLink?.token ?? null} initialPortalToken={portalLink?.token ?? null} />
}
