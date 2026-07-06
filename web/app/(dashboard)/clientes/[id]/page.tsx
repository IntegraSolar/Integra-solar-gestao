// web/app/(dashboard)/clientes/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getClientById } from '@/lib/clients/queries'
import { redirect, notFound } from 'next/navigation'
import { ClientTabs } from './ClientTabs'

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Autenticação e dados do cliente em paralelo
  const [user, client] = await Promise.all([
    getCurrentUserData(),
    getClientById(id),
  ])

  if (!user?.membership) redirect('/login')
  if (!client) notFound()

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <a
          href="/clientes"
          className="text-xs"
          style={{ color: 'var(--theme-text-subtle)' }}
        >
          ← Clientes
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
      <ClientTabs client={client} />
    </div>
  )
}
