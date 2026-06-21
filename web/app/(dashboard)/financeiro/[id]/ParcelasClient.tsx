// web/app/(dashboard)/financeiro/[id]/ParcelasClient.tsx
'use client'

import { useTransition, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { confirmInstallment, advanceToProjects, uploadReceipt } from '@/lib/financeiro/actions'
import type { FinanceiroInstallment } from '@/lib/financeiro/queries'
import { Paperclip, ExternalLink } from 'lucide-react'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ParcelaRow({
  p,
  isPending,
  onConfirm,
  onMessage,
}: {
  p: FinanceiroInstallment
  isPending: boolean
  onConfirm: (id: string) => void
  onMessage: (msg: { type: 'error' | 'success'; text: string }) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localReceiptUrl, setLocalReceiptUrl] = useState<string | null>(p.receipt_url)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadReceipt(p.id, fd)
    if (result.error) {
      onMessage({ type: 'error', text: result.error })
    } else {
      onMessage({ type: 'success', text: result.success! })
      if (result.receipt_url) setLocalReceiptUrl(result.receipt_url)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
          {p.position === 1 ? 'Entrada' : `Parcela ${p.position}`}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
          Venc: {new Date(p.due_date).toLocaleDateString('pt-BR')}
          {p.confirmed_at
            ? ` · Pago em: ${new Date(p.confirmed_at).toLocaleDateString('pt-BR')}`
            : ''}
        </p>
      </div>

      <p className="text-sm font-semibold flex-shrink-0" style={{ color: 'var(--theme-text)' }}>
        {formatBRL(p.amount)}
      </p>

      {/* Comprovante */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {localReceiptUrl ? (
          <a
            href={localReceiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--theme-accent)' }}
            title="Ver comprovante"
          >
            <ExternalLink size={12} />
            Comprovante
          </a>
        ) : (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--theme-text-subtle)' }}
              title="Anexar comprovante"
            >
              <Paperclip size={12} />
              {uploading ? 'Enviando...' : 'Anexar'}
            </button>
          </>
        )}
      </div>

      {/* Status / Confirmar */}
      {p.status === 'confirmada' ? (
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
          ✓ Pago
        </span>
      ) : (
        <Button
          variant="secondary"
          className="text-xs py-1 px-2.5 flex-shrink-0"
          onClick={() => {
            if (window.confirm('Tem certeza que deseja confirmar este pagamento?\n\nATENÇÃO: Esta ação não poderá ser revertida. Certifique-se de que o pagamento foi realmente recebido.')) {
              onConfirm(p.id)
            }
          }}
          loading={isPending}
          type="button"
        >
          Confirmar
        </Button>
      )}
    </div>
  )
}

export function ParcelasClient({
  clientId,
  parcelas,
  pipelineStage,
}: {
  clientId: string
  parcelas: FinanceiroInstallment[]
  pipelineStage: string
}) {
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm(installmentId: string) {
    startTransition(async () => {
      const result = await confirmInstallment(installmentId)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  function handleAdvance() {
    startTransition(async () => {
      const result = await advanceToProjects(clientId)
      if (result.error) setMessage({ type: 'error', text: result.error })
      if (result.success) setMessage({ type: 'success', text: result.success })
    })
  }

  const total = parcelas.reduce((sum, p) => sum + p.amount, 0)
  const confirmadas = parcelas.filter((p) => p.status === 'confirmada').reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-3 rounded-xl"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Total da venda</p>
          <p className="text-base font-semibold mt-1" style={{ color: 'var(--theme-accent)' }}>{formatBRL(total)}</p>
        </div>
        <div
          className="p-3 rounded-xl"
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Confirmado</p>
          <p className="text-base font-semibold mt-1" style={{ color: '#10B981' }}>{formatBRL(confirmadas)}</p>
        </div>
      </div>

      {/* Parcelas */}
      <div className="flex flex-col gap-2">
        {parcelas.map((p) => (
          <ParcelaRow
            key={p.id}
            p={p}
            isPending={isPending}
            onConfirm={handleConfirm}
            onMessage={setMessage}
          />
        ))}
      </div>

      {message && (
        <p className="text-sm" style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}>
          {message.text}
        </p>
      )}

      {/* Avançar pipeline */}
      {pipelineStage === 'financeiro' && (
        <div
          className="flex items-center justify-between p-3 rounded-xl mt-2"
          style={{ background: 'rgba(255,200,100,0.05)', border: '1px solid rgba(255,200,100,0.15)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
              Avançar para Projetos
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>
              Quando o financeiro estiver em ordem
            </p>
          </div>
          <Button
            variant="primary"
            className="text-xs py-1.5 px-3"
            onClick={handleAdvance}
            loading={isPending}
            type="button"
          >
            Avançar →
          </Button>
        </div>
      )}
    </div>
  )
}
