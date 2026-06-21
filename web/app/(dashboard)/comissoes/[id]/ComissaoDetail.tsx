// web/app/(dashboard)/comissoes/[id]/ComissaoDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ComissaoItem } from '@/lib/comissoes/queries'
import { markCommissionPaid } from '@/lib/comissoes/actions'
import { formatCurrency, formatDate } from '@/lib/format'

export default function ComissaoDetail({ comissao }: { comissao: ComissaoItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [comprovanteUrl, setComprovanteUrl] = useState('')

  function handleMarkPaid() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await markCommissionPaid(comissao.id, comprovanteUrl || undefined)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Comissão marcada como paga.')
        router.push('/comissoes')
      }
    })
  }

  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-3'
  const cardStyle = { background: 'var(--theme-surface)' }
  const labelCls = 'text-xs text-white/50'
  const valueCls = 'text-sm text-white font-medium'

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{comissao.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">Comissão de venda</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs border ${
            comissao.status === 'paga'
              ? 'bg-green-500/20 text-green-300 border-green-500/40'
              : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
          }`}
        >
          {comissao.status === 'paga' ? 'Paga' : 'Pendente'}
        </span>
      </div>

      {/* Detalhes */}
      <div className={cardCls} style={cardStyle}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={labelCls}>Vendedor</p>
            <p className={valueCls}>{comissao.vendedor_name ?? '—'}</p>
          </div>
          <div>
            <p className={labelCls}>Valor da Comissão</p>
            <p className="text-xl font-bold" style={{ color: 'var(--theme-accent)' }}>
              {formatCurrency(comissao.valor_comissao)}
            </p>
          </div>
          <div>
            <p className={labelCls}>Criada em</p>
            <p className={valueCls}>{formatDate(comissao.created_at)}</p>
          </div>
          {comissao.status === 'paga' && comissao.paid_at && (
            <div>
              <p className={labelCls}>Paga em</p>
              <p className={valueCls}>{formatDate(comissao.paid_at)}</p>
            </div>
          )}
        </div>
        {comissao.comprovante_url && (
          <a
            href={comissao.comprovante_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
            style={{ color: 'var(--theme-accent)' }}
          >
            Ver comprovante
          </a>
        )}
      </div>

      {/* Marcar como paga */}
      {comissao.status === 'pendente' && (
        <div className={cardCls} style={cardStyle}>
          <h2 className="text-sm font-semibold text-white/70">Marcar como Paga</h2>
          <div>
            <label className={`block ${labelCls} mb-1`}>URL do comprovante (opcional)</label>
            <input
              type="url"
              value={comprovanteUrl}
              onChange={(e) => setComprovanteUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
              {success}
            </p>
          )}
          <button
            onClick={handleMarkPaid}
            disabled={isPending}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
            style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
          >
            {isPending ? 'Processando…' : 'Marcar como Paga'}
          </button>
        </div>
      )}
    </div>
  )
}
