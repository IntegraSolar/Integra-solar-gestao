// web/app/(dashboard)/leads/page.tsx
import { getCurrentUserData } from '@/lib/org/queries'
import { getLeads, getFunnelStages, getLeadSources, getOrgMembers, ensureDefaultStages } from '@/lib/crm/queries'
import { redirect } from 'next/navigation'
import { LeadsClient } from './LeadsClient'

export default async function LeadsPage() {
  const user = await getCurrentUserData()
  if (!user?.membership) redirect('/login')

  await ensureDefaultStages(user.membership.organization.id)

  const [leads, stages, sources, members] = await Promise.all([
    getLeads(),
    getFunnelStages(),
    getLeadSources(),
    getOrgMembers(),
  ])

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>
            CRM / Leads
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
            {leads.length} leads
          </p>
        </div>
      </div>

      <LeadsClient
        initialLeads={leads}
        stages={stages}
        sources={sources}
        members={members}
      />
    </div>
  )
}
