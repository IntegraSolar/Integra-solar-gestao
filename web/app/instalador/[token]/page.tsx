// web/app/instalador/[token]/page.tsx
import type { Metadata } from 'next'
import InstallerView from './InstallerView'

export const metadata: Metadata = {
  title: 'Integra Solar — Dados da Instalação',
  description: 'Informações para a equipe de instalação',
}

export default function InstallerPage({ params }: { params: Promise<{ token: string }> }) {
  return <InstallerView paramsPromise={params} />
}
