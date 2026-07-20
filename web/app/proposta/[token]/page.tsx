export const metadata = { title: 'Proposta Comercial' }

import PropostaView from './PropostaView'

export default async function PropostaPage({ params }: { params: Promise<{ token: string }> }) {
  return <PropostaView paramsPromise={params} />
}
