// web/app/proposta-usina/[token]/page.tsx
export const metadata = { title: 'Proposta de Investimento' }
import PropostaUsinaView from './PropostaUsinaView'
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <PropostaUsinaView paramsPromise={params} />
}
