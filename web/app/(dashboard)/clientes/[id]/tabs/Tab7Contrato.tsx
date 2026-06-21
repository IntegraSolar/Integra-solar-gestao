// web/app/(dashboard)/clientes/[id]/tabs/Tab7Contrato.tsx
'use client'

import { useTransition } from 'react'
import { uploadContractFile } from '@/lib/clients/actions'
import type { Client } from '@/lib/clients/types'

function UploadField({
  client,
  field,
  label,
  currentUrl,
}: {
  client: Client
  field: 'contract' | 'procuracao'
  label: string
  currentUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      await uploadContractFile(client.id, field, {}, fd)
    })
    e.target.value = ''
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>{label}</p>

      {currentUrl ? (
        <div className="flex items-center justify-between">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
            style={{ color: '#3B82F6' }}
          >
            Ver arquivo enviado →
          </a>
          <label
            className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--theme-input-bg)', border: '1px solid var(--theme-input-border)', color: 'var(--theme-text-muted)' }}
          >
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
            {isPending ? 'Enviando...' : 'Substituir'}
          </label>
        </div>
      ) : (
        <label
          className="flex items-center justify-center gap-2 cursor-pointer py-6 rounded-xl transition-all"
          style={{
            border: '2px dashed var(--theme-input-border)',
            color: 'var(--theme-text-subtle)',
          }}
        >
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleChange} />
          <span className="text-sm">{isPending ? 'Enviando...' : '+ Clique para enviar (PDF, JPG ou PNG)'}</span>
        </label>
      )}
    </div>
  )
}

export function Tab7Contrato({ client }: { client: Client }) {
  const contract = client.contract

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <UploadField
        client={client}
        field="contract"
        label="Contrato assinado"
        currentUrl={contract?.contract_url ?? null}
      />

      <UploadField
        client={client}
        field="procuracao"
        label="Procuração (se aplicável)"
        currentUrl={contract?.power_of_attorney_url ?? null}
      />

      {contract?.contract_url && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}
        >
          <span style={{ color: '#10B981' }}>✓</span>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Contrato enviado — cliente liberado no módulo <strong>Contratos</strong>
          </p>
        </div>
      )}

      {!contract?.contract_url && (
        <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
          O envio do contrato libera o cliente no módulo Contratos.
        </p>
      )}
    </div>
  )
}
