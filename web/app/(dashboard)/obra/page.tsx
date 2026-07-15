export const metadata = { title: "Obras" }
import { getObras } from '@/lib/obra/queries'
import ObraClientComponent from './ObraClient'

export default async function ObraPage() {
  const obras = await getObras()
  return <ObraClientComponent obras={obras} />
}
