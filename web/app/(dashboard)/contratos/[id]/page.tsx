// web/app/(dashboard)/contratos/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getContratoById } from '@/lib/contratos/queries'
import { redirect, notFound } from 'next/navigation'
import { ContratoDetail } from './ContratoDetail'

export default async function ContratoPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const client = await getContratoById(params.id)
  if (!client) notFound()

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <a href="/contratos" className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
          ← Contratos
        </a>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
            {client.name}
          </h1>
          {client.city && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
              {client.city}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        <ContratoDetail client={client} />
      </div>
    </div>
  )
}
