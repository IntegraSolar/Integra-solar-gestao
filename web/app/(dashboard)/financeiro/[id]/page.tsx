// web/app/(dashboard)/financeiro/[id]/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getParcelasByClient } from '@/lib/financeiro/queries'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParcelasClient } from './ParcelasClient'

export default async function FinanceiroClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const supabase = await createClient()
  const { data: clientData } = await supabase
    .from('clients')
    .select('id, name, city, pipeline_stage')
    .eq('id', id)
    .eq('organization_id', user.membership.organization.id)
    .single()

  if (!clientData) redirect('/financeiro')

  const parcelas = await getParcelasByClient(id)

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <a href="/financeiro" className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
          ← Financeiro
        </a>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
            {(clientData as any).name}
          </h1>
          {(clientData as any).city && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
              {(clientData as any).city}
            </p>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-5">
        <ParcelasClient
          clientId={id}
          parcelas={parcelas}
          pipelineStage={(clientData as any).pipeline_stage}
        />
      </div>
    </div>
  )
}
