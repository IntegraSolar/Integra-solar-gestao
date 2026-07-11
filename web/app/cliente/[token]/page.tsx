import type { Metadata } from 'next'
import ClientPortalView from './ClientPortalView'

export const metadata: Metadata = {
  title: 'Portal do Cliente — Integra Solar',
  description: 'Acompanhe o andamento do seu projeto solar',
}

export default function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  return <ClientPortalView paramsPromise={params} />
}
