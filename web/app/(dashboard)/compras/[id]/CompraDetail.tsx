// web/app/(dashboard)/compras/[id]/CompraDetail.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CompraClient } from '@/lib/compras/queries'
import { upsertPurchase, uploadPurchaseDoc } from '@/lib/compras/actions'
import { CurrencyInput, DatePicker } from '@/components/ui/inputs'
import { Paperclip, ExternalLink, FileText } from 'lucide-react'
import { secureStorageUrl } from '@/lib/storage/url'

const STATUS_OPTIONS = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'confirmado', label: 'Confirmado' },
]

const STATUS_BADGE: Record<string, string> = {
  aguardando: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  confirmado: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
}

function DocUploadRow({
  label,
  url,
  clientId,
  docType,
  onUploaded,
  onMessage,
}: {
  label: string
  url: string | null
  clientId: string
  docType: 'nf_equipamentos' | 'romaneio' | 'comprovante'
  onUploaded: (url: string) => void
  onMessage: (msg: { type: 'error' | 'success'; text: string }) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadPurchaseDoc(clientId, docType, fd)
    if (result.error) {
      onMessage({ type: 'error', text: result.error })
    } else {
      onMessage({ type: 'success', text: result.success! })
      if (result.url) onUploaded(result.url)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText size={15} style={{ color: 'var(--theme-text-subtle)', flexShrink: 0 }} />
        <span className="text-sm text-white/70 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {url ? (
          <>
            <a
              href={secureStorageUrl(url) ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--theme-accent)' }}
            >
              <ExternalLink size={12} /> Ver documento
            </a>
            <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs px-2 py-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
            >
              {uploading ? '...' : 'Substituir'}
            </button>
          </>
        ) : (
          <>
            <input ref={fileRef} type="file" accept=".pdf,image/*" onChange={handleFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              <Paperclip size={12} />
              {uploading ? 'Enviando...' : 'Anexar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CompraDetail({
  compra,
  clientId,
}: {
  compra: CompraClient
  clientId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [form, setForm] = useState({
    fornecedor: compra.fornecedor ?? '',
    itens: compra.itens ?? '',
    valor: compra.valor?.toString() ?? '',
    data_prevista: compra.data_prevista ?? '',
    status: compra.status,
  })

  const [docUrls, setDocUrls] = useState({
    nf_equipamentos_url: (compra as any).nf_equipamentos_url ?? null as string | null,
    romaneio_url: (compra as any).romaneio_url ?? null as string | null,
    comprovante_url: compra.comprovante_url ?? null as string | null,
  })

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertPurchase(clientId, {
        fornecedor: form.fornecedor || null,
        itens: form.itens || null,
        valor: form.valor ? parseFloat(form.valor) : null,
        data_prevista: form.data_prevista || null,
        status: form.status,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'confirmado') router.push('/compras')
      }
    })
  }

  function handleDocMessage(msg: { type: 'error' | 'success'; text: string }) {
    if (msg.type === 'error') setError(msg.text)
    else setSuccess(msg.text)
  }

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'var(--theme-surface)' }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{compra.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">Pedido de Compra</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs border ${STATUS_BADGE[compra.status] ?? 'bg-gray-500/20 text-gray-300'}`}
        >
          {STATUS_OPTIONS.find((o) => o.value === compra.status)?.label ?? compra.status}
        </span>
      </div>

      {/* Dias em Compras */}
      <div
        className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--theme-surface)' }}
      >
        <span className="text-white/50 text-sm">Dias em Compras:</span>
        <span className="text-white font-semibold">
          {compra.dias_em_compras} dias
        </span>
      </div>

      {/* Pedido */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Pedido</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Fornecedor</label>
            <input
              type="text"
              value={form.fornecedor}
              onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))}
              className={inputCls}
              placeholder="Nome do fornecedor"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Itens</label>
            <textarea
              value={form.itens}
              onChange={(e) => setForm((f) => ({ ...f, itens: e.target.value }))}
              className={inputCls + ' min-h-[80px] resize-none'}
              placeholder="Descrição dos itens do pedido"
            />
          </div>
          <div>
            <CurrencyInput label="Valor (R$)" value={form.valor ? parseFloat(form.valor) : null} onChange={(v) => setForm((f) => ({ ...f, valor: v.toFixed(2) }))} />
          </div>
          <div>
            <DatePicker label="Data prevista de entrega" value={form.data_prevista || null} onChange={(iso) => setForm((f) => ({ ...f, data_prevista: iso }))} />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Status</h2>
        <div>
          <label className={labelCls}>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className={inputCls}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documentos */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Documentos</h2>
        <div className="space-y-3">
          <DocUploadRow
            label="NF dos Equipamentos"
            url={docUrls.nf_equipamentos_url}
            clientId={clientId}
            docType="nf_equipamentos"
            onUploaded={(url) => setDocUrls((prev) => ({ ...prev, nf_equipamentos_url: url }))}
            onMessage={handleDocMessage}
          />
          <DocUploadRow
            label="Romaneio"
            url={docUrls.romaneio_url}
            clientId={clientId}
            docType="romaneio"
            onUploaded={(url) => setDocUrls((prev) => ({ ...prev, romaneio_url: url }))}
            onMessage={handleDocMessage}
          />
          <DocUploadRow
            label="Comprovante"
            url={docUrls.comprovante_url}
            clientId={clientId}
            docType="comprovante"
            onUploaded={(url) => setDocUrls((prev) => ({ ...prev, comprovante_url: url }))}
            onMessage={handleDocMessage}
          />
        </div>
      </div>

      {/* Feedback + Salvar */}
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>
      )}
      {success && (
        <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>
      )}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
      >
        {isPending ? 'Salvando…' : 'Salvar e liberar para Entrega de Material'}
      </button>
    </div>
  )
}
