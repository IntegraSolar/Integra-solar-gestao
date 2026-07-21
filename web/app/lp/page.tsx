// Destino das campanhas do Google Ads. Serve exatamente a mesma landing page da
// raiz — o endereço separado existe para que o tráfego pago seja identificável
// em relatórios e para permitir, no futuro, variações por campanha.
import type { Metadata } from 'next'
import LandingPage from '@/components/landing/LandingPage'

export const metadata: Metadata = {
  // Mesmo conteúdo em dois endereços. O canônico diz ao Google que a versão a
  // ranquear é a raiz, evitando que as duas concorram entre si na busca
  // orgânica. Não afeta o anúncio: o Ads usa a URL final que você cadastrar.
  alternates: {
    canonical: 'https://integrasolar.app.br/',
  },
}

export default function LandingAds() {
  return <LandingPage />
}
