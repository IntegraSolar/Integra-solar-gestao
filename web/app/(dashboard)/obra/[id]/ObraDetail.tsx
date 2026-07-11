// web/app/(dashboard)/obra/[id]/ObraDetail.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ObraClient, ObraMember } from '@/lib/obra/queries'
import { upsertObra, generateInstallerLink } from '@/lib/obra/actions'
import { DatePicker } from '@/components/ui/inputs'
import { Link2, Copy, ExternalLink, RefreshCw, Check } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluida', label: 'Concluída' },
]

const STATUS_BADGE: Record<string, string> = {
  aguardando: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  em_andamento: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  concluida: 'bg-green-500/20 text-green-300 border-green-500/40',
}

export default function ObraDetail({
  obra,
  members,
  clientId,
  initialToken,
}: {
  obra: ObraClient
  members: ObraMember[]
  clientId: string
  initialToken: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [installerToken, setInstallerToken] = useState<string | null>(initialToken)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    data_inicio: obra.data_inicio ?? '',
    data_prevista: obra.data_prevista ?? '',
    status: obra.status,
    responsavel_id: obra.responsavel_id ?? '',
    equipe_nome: obra.equipe_nome ?? '',
  })

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertObra(clientId, {
        data_inicio: form.data_inicio || null,
        data_prevista: form.data_prevista || null,
        status: form.status,
        responsavel_id: form.responsavel_id || null,
        equipe_nome: form.equipe_nome || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'concluida') router.push('/obra')
      }
    })
  }

  async function handleGenerateLink() {
    setGeneratingLink(true)
    setError(null)
    const result = await generateInstallerLink(clientId)
    if (result.error) {
      setError(result.error)
    } else if (result.token) {
      setInstallerToken(result.token)
      setSuccess('Link do instalador gerado.')
    }
    setGeneratingLink(false)
  }

  function getInstallerUrl() {
    if (!installerToken) return ''
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/instalador/${installerToken}`
  }

  async function handleCopyLink() {
    const url = getInstallerUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
  const labelCls = 'block text-xs text-white/50 mb-1'
  const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
  const cardStyle = { background: 'var(--theme-surface)' }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{obra.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{obra.client_city}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs border ${STATUS_BADGE[obra.status] ?? 'bg-gray-500/20 text-gray-300'}`}>
          {STATUS_OPTIONS.find((o) => o.value === obra.status)?.label ?? obra.status}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3" style={cardStyle}>
        <span className="text-white/50 text-sm">Prazo global:</span>
        <span className="text-white font-semibold">{obra.dias_usados} / {obra.contract_max_days ?? '—'} dias</span>
      </div>

      {/* Link do Instalador */}
      <div className={cardCls} style={{ ...cardStyle, borderColor: 'rgba(59,130,246,0.25)' }}>
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-blue-400" />
          <h2 className="text-sm font-semibold text-blue-300">Link do Instalador</h2>
        </div>

        {installerToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
              <span className="text-xs text-white/50 truncate flex-1 font-mono">
                {getInstallerUrl()}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors flex-1 justify-center"
                style={{
                  background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.12)',
                  color: copied ? '#10B981' : '#60A5FA',
                  border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.25)'}`,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
              <a
                href={getInstallerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors flex-1 justify-center"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)' }}
              >
                <ExternalLink size={13} />
                Abrir link
              </a>
            </div>
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors w-full justify-center disabled:opacity-50"
            >
              <RefreshCw size={12} className={generatingLink ? 'animate-spin' : ''} />
              {generatingLink ? 'Gerando...' : 'Gerar novo link (invalida o anterior)'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerateLink}
            disabled={generatingLink}
            className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-lg transition-colors w-full justify-center disabled:opacity-50"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px dashed rgba(59,130,246,0.35)' }}
          >
            <Link2 size={14} />
            {generatingLink ? 'Gerando...' : 'Gerar Link do Instalador'}
          </button>
        )}
      </div>

      {obra.has_adaptation_works && obra.adaptation_details.length > 0 && (
        <div className={cardCls} style={{ ...cardStyle, borderColor: 'rgba(255,160,60,0.25)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-accent)' }}>Obras de Adaptação</h2>
          <div className="space-y-2">
            {obra.adaptation_details.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,200,100,0.04)', border: '1px solid rgba(255,200,100,0.10)' }}
              >
                <span className="text-xs font-bold mt-0.5" style={{ color: 'var(--theme-accent)' }}>{i + 1}.</span>
                <span className="text-sm text-white/70">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Dados da Obra</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <DatePicker label="Data de início" value={form.data_inicio || null} onChange={(iso) => setForm((f) => ({ ...f, data_inicio: iso }))} />
          </div>
          <div>
            <DatePicker label="Data prevista de conclusão" value={form.data_prevista || null} onChange={(iso) => setForm((f) => ({ ...f, data_prevista: iso }))} />
          </div>
          <div>
            <label className={labelCls}>Nome da equipe</label>
            <input type="text" value={form.equipe_nome} onChange={(e) => setForm((f) => ({ ...f, equipe_nome: e.target.value }))} className={inputCls} placeholder="Ex: Equipe Alpha" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
              {STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">{success}</p>}
      <button onClick={handleSave} disabled={isPending} className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50" style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}>
        {isPending ? 'Salvando…' : 'Salvar e liberar Entrega da Obra'}
      </button>
    </div>
  )
}
