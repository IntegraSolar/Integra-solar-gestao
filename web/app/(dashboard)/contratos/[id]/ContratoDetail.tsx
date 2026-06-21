// web/app/(dashboard)/contratos/[id]/ContratoDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { updateContractStatus } from '@/lib/contratos/actions'
import type { ContratoClient } from '@/lib/contratos/queries'
import type { ContractStatus } from '@/lib/contratos/actions'

const selectStyle: React.CSSProperties = {
  background: 'var(--theme-input-bg)',
  border: '1px solid var(--theme-input-border)',
  color: 'var(--theme-input-text)',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  width: '100%',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  color: 'var(--theme-text-muted)',
  marginBottom: 6,
  display: 'block',
}

export function ContratoDetail({ client }: { client: ContratoClient }) {
  const contract = client.contract
  const [status, setStatus] = useState<ContractStatus>(
    (contract?.status as ContractStatus) ?? 'aguardando_assinatura'
  )
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateContractStatus(client.id, status)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Arquivos */}
      <div
        className="flex flex-col gap-3 p-4 rounded-xl"
        style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
      >
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-text-muted)' }}>
          Documentos
        </p>
        {contract?.contract_url ? (
          <a
            href={contract.contract_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
            style={{ color: '#3B82F6' }}
          >
            Ver contrato assinado →
          </a>
        ) : (
          <p className="text-sm" style={{ color: 'var(--theme-text-subtle)' }}>
            Nenhum contrato enviado.
          </p>
        )}
        {contract?.power_of_attorney_url && (
          <a
            href={contract.power_of_attorney_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm"
            style={{ color: '#3B82F6' }}
          >
            Ver procuração →
          </a>
        )}
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Status do contrato</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ContractStatus)}
          style={selectStyle}
        >
          <option value="aguardando_assinatura">Aguardando assinatura</option>
          <option value="assinado">Assinado</option>
          <option value="distratado">Distratado</option>
        </select>
      </div>

      {message && (
        <p
          className="text-sm"
          style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}
        >
          {message.text}
        </p>
      )}

      <Button
        variant="primary"
        onClick={handleSave}
        loading={isPending}
        disabled={isPending}
        type="button"
        className="self-start"
      >
        {status === 'assinado' ? 'Confirmar Assinatura' : 'Salvar Status'}
      </Button>

      {status === 'assinado' && (
        <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
          Ao confirmar, o cliente avança automaticamente para o módulo Financeiro.
        </p>
      )}
    </div>
  )
}
