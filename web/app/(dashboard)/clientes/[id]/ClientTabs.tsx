// web/app/(dashboard)/clientes/[id]/ClientTabs.tsx
'use client'

import { useState } from 'react'
import type { Client } from '@/lib/clients/types'
import { Tab1DadosPessoais } from './tabs/Tab1DadosPessoais'
import { Tab3VendaFat } from './tabs/Tab3VendaFat'
import { Tab4Vistoria } from './tabs/Tab4Vistoria'
import { Tab5Prazos } from './tabs/Tab5Prazos'
import { Tab6Anexos } from './tabs/Tab6Anexos'
import { Tab7Contrato } from './tabs/Tab7Contrato'
import { Tab8PastaCompleta } from './tabs/Tab8PastaCompleta'
import { Tab9Links } from './tabs/Tab9Links'

const TABS = [
  { key: 'tab1', label: 'Dados Pessoais' },
  { key: 'tab3', label: 'Vendas e Faturamento' },
  { key: 'tab4', label: 'Vistoria' },
  { key: 'tab5', label: 'Prazos' },
  { key: 'tab6', label: 'Anexos' },
  { key: 'tab7', label: 'Contrato' },
  { key: 'tab8', label: 'Todos os Dados' },
  { key: 'tab9', label: 'Links' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function ClientTabs({ client }: { client: Client }) {
  const [active, setActive] = useState<TabKey>('tab1')

  function isDone(key: string) {
    return key === 'tab8' || key === 'tab9' ? false : client.completed_tabs[key] === true
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab nav */}
      <div
        className="flex gap-1 px-6 py-3 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--theme-border)' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
            style={
              active === tab.key
                ? { background: 'rgba(255,200,100,0.12)', color: 'var(--theme-accent)' }
                : { color: 'var(--theme-text-muted)' }
            }
          >
            {isDone(tab.key) && (
              <span style={{ color: '#10B981', fontSize: 10 }}>✓</span>
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {active === 'tab1' && <Tab1DadosPessoais client={client} />}
        {active === 'tab3' && <Tab3VendaFat client={client} />}
        {active === 'tab4' && <Tab4Vistoria client={client} />}
        {active === 'tab5' && <Tab5Prazos client={client} />}
        {active === 'tab6' && <Tab6Anexos client={client} />}
        {active === 'tab7' && <Tab7Contrato client={client} />}
        {active === 'tab8' && <Tab8PastaCompleta client={client} />}
        {active === 'tab9' && <Tab9Links client={client} />}
      </div>
    </div>
  )
}
