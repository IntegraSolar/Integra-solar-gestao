import { getCurrentUserData } from '@/lib/org/queries'
import { getFunnelStages } from '@/lib/crm/queries'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FunnelConfig } from '@/components/crm/FunnelConfig'

export default async function ConfigurarFunilPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  const stages = await getFunnelStages()

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/leads"
          className="text-xs"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          ← CRM / Leads
        </Link>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
          Configurar funil
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--theme-text-muted)' }}>
        Arraste para reordenar as etapas. Clique em &quot;editar&quot; para renomear ou trocar a cor.
      </p>
      <FunnelConfig initialStages={stages} />
    </div>
  )
}
