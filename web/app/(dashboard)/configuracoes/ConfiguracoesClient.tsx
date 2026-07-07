'use client'

import { useState } from 'react'
import type { OrgConfig, LeadOrigin } from '@/lib/configuracoes/queries'
import type { Colaborador } from '@/lib/colaboradores/queries'
import type { AuditLog } from '@/lib/auditoria/queries'
import type { ProposalTemplate } from '@/lib/crm/types'
import EmpresaTab from './EmpresaTab'
import AcessoTab from './AcessoTab'
import AuditoriaTab from './AuditoriaTab'
import TemplatesTab from './TemplatesTab'
import AparenciaTab from './AparenciaTab'
import LgpdTab from './LgpdTab'

const TABS = [
  { key: 'empresa', label: 'Empresa' },
  { key: 'acesso', label: 'Acesso' },
  { key: 'templates', label: 'Templates' },
  { key: 'auditoria', label: 'Auditoria' },
  { key: 'lgpd', label: 'LGPD' },
  { key: 'aparencia', label: 'Aparência' },
] as const

type TabKey = typeof TABS[number]['key']

export default function ConfiguracoesClient({
  config,
  origins,
  colaboradores,
  auditLogs,
  auditTotal,
  proposalTemplates,
}: {
  config: OrgConfig
  origins: LeadOrigin[]
  colaboradores: Colaborador[]
  auditLogs: AuditLog[]
  auditTotal: number
  proposalTemplates: ProposalTemplate[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('empresa')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-white/50 text-sm mt-1">Gerencie sua empresa, equipe e auditoria</p>
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 rounded-xl p-1 overflow-x-auto max-w-full"
        style={{ background: 'var(--theme-input-bg)' }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={
              activeTab === t.key
                ? { background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }
                : { color: 'var(--theme-text-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'empresa'   && <EmpresaTab config={config} origins={origins} />}
      {activeTab === 'acesso'    && <AcessoTab colaboradores={colaboradores} />}
      {activeTab === 'templates' && <TemplatesTab initialTemplates={proposalTemplates} />}
      {activeTab === 'auditoria' && <AuditoriaTab logs={auditLogs} total={auditTotal} />}
      {activeTab === 'lgpd'      && <LgpdTab />}
      {activeTab === 'aparencia' && <AparenciaTab />}
    </div>
  )
}
