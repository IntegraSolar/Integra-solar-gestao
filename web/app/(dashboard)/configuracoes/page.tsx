export const metadata = { title: "Configurações" }
import { requireModuleAccess } from '@/lib/org/permissions'
import { getOrgConfig, getLeadOrigins } from '@/lib/configuracoes/queries'
import { getColaboradores } from '@/lib/colaboradores/queries'
import { getAuditLogs } from '@/lib/auditoria/queries'
import { getProposalTemplates } from '@/lib/proposals/templates'
import ConfiguracoesClient from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  await requireModuleAccess('configuracoes')
  const [config, origins, colaboradores, { logs, total }, proposalTemplates] = await Promise.all([
    getOrgConfig(),
    getLeadOrigins(),
    getColaboradores(),
    getAuditLogs(1, 20),
    getProposalTemplates(),
  ])

  return (
    <ConfiguracoesClient
      config={config}
      origins={origins}
      colaboradores={colaboradores}
      auditLogs={logs}
      auditTotal={total}
      proposalTemplates={proposalTemplates}
    />
  )
}
