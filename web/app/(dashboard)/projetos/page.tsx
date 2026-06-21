import { getProjetos } from '@/lib/projetos/queries'
import ProjetosClient from './ProjetosClient'

export default async function ProjetosPage() {
  const projetos = await getProjetos()
  return <ProjetosClient projetos={projetos} />
}
