// web/app/(dashboard)/projetos/[id]/ProjetoDetail.tsx
'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjetoClient, ProjetoMember } from '@/lib/projetos/queries'
import { upsertProject, uploadProjectAttachment, deleteProjectAttachment, generateProjetistaLink } from '@/lib/projetos/actions'
import type { ProjectAttachment } from '@/lib/projetos/actions'
import { DatePicker } from '@/components/ui/inputs'
import { ExternalLink, FileText, Plus, Trash2, Copy, Check, Link2 } from 'lucide-react'

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

const MAX_ATTACHMENTS = 10

export default function ProjetoDetail({
  projeto,
  members,
  clientId,
  initialAttachments,
  initialProjetistaToken,
}: {
  projeto: ProjetoClient
  members: ProjetoMember[]
  clientId: string
  initialAttachments: ProjectAttachment[]
  initialProjetistaToken: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [attachments, setAttachments] = useState<ProjectAttachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [projetistaToken, setProjetistaToken] = useState<string | null>(initialProjetistaToken)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

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

  async function handleUploadAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadProjectAttachment(projeto.id, fd)
    if (result.error) {
      setError(result.error)
    } else if (result.attachment) {
      setAttachments((prev) => [...prev, result.attachment!])
      setSuccess(result.success ?? 'Anexo enviado.')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDeleteAttachment(id: string) {
    setDeletingId(id)
    setError(null)
    const result = await deleteProjectAttachment(id)
    if (result.error) {
      setError(result.error)
    } else {
      setAttachments((prev) => prev.filter((a) => a.id !== id))
      setSuccess(result.success ?? 'Anexo removido.')
    }
    setDeletingId(null)
  }

  function attachmentUrl(filePath: string): string {
    return `/api/storage/download?bucket=project-docs&path=${encodeURIComponent(filePath)}`
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

      {/* Anexos do Projeto */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">Anexos do Projeto</h2>
          <span className="text-xs text-white/30">{attachments.length}/{MAX_ATTACHMENTS}</span>
        </div>
        <div className="space-y-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--theme-border)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={15} style={{ color: 'var(--theme-text-subtle)', flexShrink: 0 }} />
                <span className="text-sm text-white/70 truncate">{att.file_name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={attachmentUrl(att.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: 'var(--theme-accent)' }}
                >
                  <ExternalLink size={12} /> Ver
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(att.id)}
                  disabled={deletingId === att.id}
                  className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  {deletingId === att.id ? '...' : 'Remover'}
                </button>
              </div>
            </div>
          ))}

          {attachments.length === 0 && (
            <p className="text-xs text-white/30 text-center py-3">Nenhum anexo adicionado.</p>
          )}
        </div>

        {attachments.length < MAX_ATTACHMENTS && (
          <>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.dwg,.dxf,image/*" onChange={handleUploadAttachment} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors hover:bg-white/10 w-full justify-center"
              style={{ color: 'var(--theme-text-muted)', border: '1px dashed var(--theme-border)' }}
            >
              <Plus size={14} />
              {uploading ? 'Enviando...' : 'Adicionar anexo'}
            </button>
          </>
        )}
      </div>

      {/* Link do Projetista */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center gap-2">
          <Link2 size={16} style={{ color: '#3B82F6' }} />
          <h2 className="text-sm font-semibold text-white/70">Link do Projetista</h2>
        </div>
        {projetistaToken ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <p className="text-[11px] text-blue-400/60 mb-1">URL do projetista</p>
              <p className="text-xs text-blue-300 font-mono break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/projetista/{projetistaToken}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/projetista/${projetistaToken}`)
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                }}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: linkCopied ? '#10B981' : '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}
              >
                {linkCopied ? <Check size={12} /> : <Copy size={12} />}
                {linkCopied ? 'Copiado!' : 'Copiar link'}
              </button>
              <a
                href={`/projetista/${projetistaToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}
              >
                <ExternalLink size={12} /> Abrir
              </a>
            </div>
            <button
              type="button"
              onClick={async () => {
                setGeneratingLink(true)
                const result = await generateProjetistaLink(clientId)
                if (result.token) setProjetistaToken(result.token)
                setGeneratingLink(false)
              }}
              disabled={generatingLink}
              className="w-full text-xs py-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {generatingLink ? 'Gerando...' : 'Gerar novo link (invalida o anterior)'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setGeneratingLink(true)
              const result = await generateProjetistaLink(clientId)
              if (result.token) setProjetistaToken(result.token)
              setGeneratingLink(false)
            }}
            disabled={generatingLink}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            {generatingLink ? 'Gerando...' : 'Gerar Link do Projetista'}
          </button>
        )}
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
