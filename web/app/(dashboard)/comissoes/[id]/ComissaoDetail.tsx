// web/app/(dashboard)/comissoes/[id]/ComissaoDetail.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ComissaoItem } from '@/lib/comissoes/queries'
import { markCommissionPaid, uploadComprovanteComissao } from '@/lib/comissoes/actions'
import { formatCurrency, formatDate, formatPercent } from '@/lib/format'

export default function ComissaoDetail({ comissao }: { comissao: ComissaoItem }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setError(null)
  }

  function handleMarkPaid() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      let comprovanteUrl: string | undefined

      if (selectedFile) {
        const fd = new FormData()
        fd.append('file', selectedFile)
        const uploadResult = await uploadComprovanteComissao(comissao.id, fd)
        if (uploadResult.error) { setError(uploadResult.error); return }
        comprovanteUrl = uploadResult.url
      }

      const result = await markCommissionPaid(comissao.id, comprovanteUrl)
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

  const isStorageUrl = comissao.comprovante_url?.startsWith('/api/storage/')
  const comprovanteHref = isStorageUrl
    ? comissao.comprovante_url
    : comissao.comprovante_url

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
            <p className={valueCls}>{comissao.vendedor_name}</p>
          </div>
          <div>
            <p className={labelCls}>Valor da Comissão</p>
            <p className="text-xl font-bold" style={{ color: 'var(--theme-accent)' }}>
              {formatCurrency(comissao.valor_comissao)}
            </p>
          </div>
          <div>
            <p className={labelCls}>Percentual</p>
            <p className={valueCls}>{formatPercent(comissao.commission_pct)}</p>
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

        {/* Comprovante existente */}
        {comprovanteHref && (
          <a
            href={comprovanteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs underline"
            style={{ color: 'var(--theme-accent)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Ver comprovante
          </a>
        )}
      </div>

      {/* Marcar como paga */}
      {comissao.status === 'pendente' && (
        <div className={cardCls} style={cardStyle}>
          <h2 className="text-sm font-semibold text-white/70">Marcar como Paga</h2>

          {/* Upload de comprovante */}
          <div>
            <label className={`block ${labelCls} mb-2`}>Comprovante (PDF ou imagem, opcional)</label>
            <div
              className="relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
              style={{
                borderColor: selectedFile ? 'var(--theme-accent)' : 'rgba(255,255,255,0.12)',
                background: selectedFile ? 'rgba(255,200,100,0.04)' : 'rgba(255,255,255,0.02)',
                padding: '20px 16px',
              }}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--theme-accent)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--theme-accent)' }}>{selectedFile.name}</p>
                  <p className="text-xs text-white/30">{(selectedFile.size / 1024).toFixed(0)} KB — clique para trocar</p>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                    <polyline points="16 16 12 12 8 16"/>
                    <line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                  <p className="text-sm text-white/40">Clique para selecionar arquivo</p>
                  <p className="text-xs text-white/20">PDF, JPG ou PNG — máx. 10 MB</p>
                </>
              )}
            </div>
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
