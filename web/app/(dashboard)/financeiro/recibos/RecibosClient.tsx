'use client'

import { useState, useMemo } from 'react'
import type { PaymentReceipt } from '@/lib/financeiro/receipt-actions'
import { formatCurrency } from '@/lib/format'
import { FileText, ExternalLink, Download, Copy, Check, Search } from 'lucide-react'
import Link from 'next/link'

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
      style={{ color: 'var(--theme-text-subtle)' }}
      title="Copiar link público"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Link'}
    </button>
  )
}

export default function RecibosClient({ receipts }: { receipts: PaymentReceipt[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return receipts
    const q = search.toLowerCase()
    return receipts.filter(r => r.client_name.toLowerCase().includes(q))
  }, [receipts, search])

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid var(--theme-border)' }}>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--theme-text)' }}>
            <FileText size={18} /> Recibos de Pagamento
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-subtle)' }}>{receipts.length} recibos gerados</p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none w-48"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center mt-4">
            <FileText size={32} className="mx-auto mb-3 text-white/20" />
            <p className="text-sm" style={{ color: 'var(--theme-text-subtle)' }}>
              {search ? 'Nenhum recibo encontrado.' : 'Nenhum recibo gerado ainda. Os recibos são criados automaticamente ao confirmar pagamentos.'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--theme-surface)', borderBottom: '1px solid var(--theme-border)' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Versão</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-white/40">Total pago</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Emitido em</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40">Por</th>
                  <th className="px-4 py-3 text-xs font-semibold text-white/40 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const publicUrl = `${origin}/api/recibos/${r.token}`
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--theme-border)' }}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/financeiro/${r.client_id}`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--theme-text)' }}
                        >
                          {r.client_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text-subtle)' }}>
                          v{r.version}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: '#4ade80' }}>
                        {formatCurrency(r.total_paid)}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--theme-text-subtle)' }}>
                        {r.created_by_name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--theme-accent)' }}
                            title="Visualizar"
                          >
                            <ExternalLink size={11} /> Ver
                          </a>
                          <a
                            href={publicUrl}
                            download={`recibo-${r.client_name}-v${r.version}.pdf`}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--theme-text-subtle)' }}
                            title="Baixar PDF"
                          >
                            <Download size={11} /> PDF
                          </a>
                          <CopyButton url={publicUrl} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
