// web/app/(dashboard)/projetos/[id]/ProjetoDetail.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjetoClient, ProjetoMember } from '@/lib/projetos/queries'
import { upsertProject, uploadProjectDoc } from '@/lib/projetos/actions'
import { DatePicker } from '@/components/ui/inputs'
import { Paperclip, ExternalLink, FileText } from 'lucide-react'
import { secureStorageUrl } from '@/lib/storage/url'

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'em_analise', label: 'Em Análise' },
  { value: 'aprovado', label: 'Aprovado' },
]

const STATUS_BADGE: Record<string, string> = {
  pendente: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  enviado: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  em_analise: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  aprovado: 'bg-green-500/20 text-green-300 border-green-500/40',
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
  docType: 'art' | 'projeto' | 'parecer_acesso'
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
    const result = await uploadProjectDoc(clientId, docType, fd)
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

export default function ProjetoDetail({
  projeto,
  members,
  clientId,
}: {
  projeto: ProjetoClient
  members: ProjetoMember[]
  clientId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [docUrls, setDocUrls] = useState({
    art_url: projeto.art_url ?? null as string | null,
    projeto_url: projeto.projeto_url ?? null as string | null,
    parecer_acesso_url: projeto.parecer_acesso_url ?? null as string | null,
  })

  const [form, setForm] = useState({
    responsavel_id: projeto.responsavel_id ?? '',
    numero_processo: projeto.numero_processo ?? '',
    data_protocolo: projeto.data_protocolo ?? '',
    prazo_protocolo: projeto.prazo_protocolo ?? '',
    data_solicitacao_vistoria: projeto.data_solicitacao_vistoria ?? '',
    prazo_vistoria: projeto.prazo_vistoria ?? '',
    status: projeto.status,
    checklist: { ...projeto.checklist },
  })

  function handleCheckbox(key: keyof typeof form.checklist) {
    setForm((f) => ({ ...f, checklist: { ...f.checklist, [key]: !f.checklist[key] } }))
  }

  function handleSave() {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await upsertProject(clientId, {
        responsavel_id: form.responsavel_id || null,
        numero_processo: form.numero_processo || null,
        data_protocolo: form.data_protocolo || null,
        prazo_protocolo: form.prazo_protocolo || null,
        data_solicitacao_vistoria: form.data_solicitacao_vistoria || null,
        prazo_vistoria: form.prazo_vistoria || null,
        status: form.status,
        checklist: form.checklist,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(result.success ?? 'Salvo.')
        if (form.status === 'aprovado') router.push('/projetos')
      }
    })
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
          <h1 className="text-2xl font-bold text-white">{projeto.client_name}</h1>
          <p className="text-white/40 text-sm mt-0.5">{projeto.client_city}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs border ${STATUS_BADGE[projeto.status] ?? 'bg-gray-500/20 text-gray-300'}`}
        >
          {STATUS_OPTIONS.find((o) => o.value === projeto.status)?.label ?? projeto.status}
        </span>
      </div>

      {/* Dias em Projetos */}
      <div
        className="rounded-xl border border-white/10 px-4 py-3 flex items-center gap-3"
        style={{ background: 'var(--theme-surface)' }}
      >
        <span className="text-white/50 text-sm">Dias em Projetos:</span>
        <span className="text-white font-semibold">
          {projeto.dias_em_projetos} dias
        </span>
      </div>

      {/* Responsável + Status */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Responsável e Status</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Responsável técnico</label>
            <input
              type="text"
              value={form.responsavel_id}
              onChange={(e) => setForm((f) => ({ ...f, responsavel_id: e.target.value }))}
              className={inputCls}
              placeholder="Nome do responsável"
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={inputCls}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Datas */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Datas do Processo</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Número do processo</label>
            <input
              type="text"
              value={form.numero_processo}
              onChange={(e) => setForm((f) => ({ ...f, numero_processo: e.target.value }))}
              className={inputCls}
              placeholder="Ex: 2024/001234"
            />
          </div>
          <div />
          <div>
            <DatePicker label="Data de protocolo" value={form.data_protocolo || null} onChange={(iso) => setForm((f) => ({ ...f, data_protocolo: iso }))} />
          </div>
          <div>
            <DatePicker label="Prazo do protocolo" value={form.prazo_protocolo || null} onChange={(iso) => setForm((f) => ({ ...f, prazo_protocolo: iso }))} />
          </div>
          <div>
            <DatePicker label="Data de solicitação de vistoria" value={form.data_solicitacao_vistoria || null} onChange={(iso) => setForm((f) => ({ ...f, data_solicitacao_vistoria: iso }))} />
          </div>
          <div>
            <DatePicker label="Prazo da vistoria" value={form.prazo_vistoria || null} onChange={(iso) => setForm((f) => ({ ...f, prazo_vistoria: iso }))} />
          </div>
        </div>
      </div>

      {/* Documentos */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-sm font-semibold text-white/70">Documentos do Projeto</h2>
        <div className="space-y-3">
          {([
            { key: 'art' as const, label: 'ART (Anotação de Responsabilidade Técnica)', urlKey: 'art_url' as const },
            { key: 'projeto' as const, label: 'Projeto Elétrico', urlKey: 'projeto_url' as const },
            { key: 'parecer_acesso' as const, label: 'Parecer de Acesso', urlKey: 'parecer_acesso_url' as const },
          ]).map(({ key, label, urlKey }) => (
            <DocUploadRow
              key={key}
              label={label}
              url={docUrls[urlKey]}
              clientId={clientId}
              docType={key}
              onUploaded={(url) => setDocUrls((prev) => ({ ...prev, [urlKey]: url }))}
              onMessage={(msg) => {
                if (msg.type === 'error') setError(msg.text)
                else setSuccess(msg.text)
              }}
            />
          ))}
        </div>
      </div>

      {/* Feedback + Salvar */}
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
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
        style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
      >
        {isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
