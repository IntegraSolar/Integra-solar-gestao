// A landing page vive em components/landing/LandingPage.tsx porque é servida em
// dois endereços: aqui, na raiz, e em /lp, usado como destino das campanhas do
// Google Ads. Um componente só garante que as duas nunca divirjam.
import LandingPage from '@/components/landing/LandingPage'

export default function Home() {
  return <LandingPage />
}
