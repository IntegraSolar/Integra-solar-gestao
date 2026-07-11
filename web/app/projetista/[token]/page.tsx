import type { Metadata } from 'next'
import ProjetistaView from './ProjetistaView'

export const metadata: Metadata = {
  title: 'Integra Solar — Dados do Projeto',
  description: 'Informações para o projetista',
}

export default function ProjetistaPage({ params }: { params: Promise<{ token: string }> }) {
  return <ProjetistaView paramsPromise={params} />
}
