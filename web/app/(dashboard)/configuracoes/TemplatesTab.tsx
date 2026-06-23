'use client'

import { useState, useTransition } from 'react'
import type { ProposalTemplate } from '@/lib/crm/types'
import {
  uploadProposalTemplate,
  updateProposalTemplate,
  deleteProposalTemplate,
} from '@/lib/proposals/actions'

export default function TemplatesTab({ initialTemplates }: { initialTemplates: ProposalTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [showUpload, setShowUpload] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [diagResult, setDiagResult] = useState<any>(null)
  const [diagLoading, setDiagLoading] = useState<string | null>(null)

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none border border-white/10 focus:border-white/30 bg-white/5'

  function handleUpload() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    if (!file) { setError('Selecione um arquivo .docx.'); return }
    if (!file.name.endsWith('.docx')) { setError('Apenas arquivos .docx são aceitos.'); return }

    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.append('name', name.trim())
      fd.append('category', category.trim())
      fd.append('file', file)
      const result = await uploadProposalTemplate(fd)
      if (result.error) { setError(result.error); return }
      window.location.reload()
    })
  }

  function handleToggleActive(t: ProposalTemplate) {
    startTransition(async () => {
      const result = await updateProposalTemplate(t.id, { is_active: !t.is_active })
      if (result.error) { setError(result.error); return }
      setTemplates((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !t.is_active } : x))
    })
  }

  function handleSetDefault(t: ProposalTemplate) {
    startTransition(async () => {
      const result = await updateProposalTemplate(t.id, { is_default: true })
      if (result.error) { setError(result.error); return }
      setTemplates((prev) => prev.map((x) => ({ ...x, is_default: x.id === t.id })))
    })
  }

  async function handleDiagnose(id: string) {
    setDiagLoading(id)
    setDiagResult(null)
    try {
      const res = await fetch(`/api/templates/${id}/diagnose`)
      const data = await res.json()
      setDiagResult(data)
    } catch {
      setDiagResult({ error: 'Erro ao diagnosticar template.' })
    } finally {
      setDiagLoading(null)
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        const result = await deleteProposalTemplate(id)
        if (result.error) { setError(result.error); return }
        setTemplates((prev) => prev.filter((x) => x.id !== id))
        setConfirmDelete(null)
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao excluir template.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">
          Templates Word (.docx) usados na geração de propostas em PDF.
        </p>
        <button
          onClick={() => { setShowUpload(true); setError(null) }}
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
        >
          + Novo Template
        </button>
      </div>

      {showUpload && (
        <div
          className="rounded-2xl p-5 border border-white/10 space-y-4"
          style={{ background: 'var(--theme-surface)' }}
        >
          <h3 className="text-sm font-semibold text-white">Enviar Template</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Nome *</label>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Proposta Residencial"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Categoria</label>
              <input
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: residencial, comercial"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Arquivo .docx *</label>
              <input
                type="file"
                accept=".docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 cursor-pointer"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(false)}
              className="flex-1 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              style={{ background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }}
            >
              {isPending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showUpload && (
        <p className="text-sm text-white/30 text-center py-8">
          Nenhum template cadastrado. Envie um arquivo .docx para começar.
        </p>
      )}

      {/* Placeholders disponíveis */}
      <div
        className="rounded-2xl p-5 border border-white/10 space-y-4"
        style={{ background: 'var(--theme-surface)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Placeholders Disponíveis</h3>
          <p className="text-xs text-white/30">Use no template .docx com {'{{ }}'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
          {[
            { group: 'Cliente', items: [
              ['cliente_nome', 'Nome do lead/cliente'],
              ['cliente_cidade', 'Cidade do lead'],
              ['cliente_telefone', 'Telefone formatado'],
            ]},
            { group: 'Empresa', items: [
              ['empresa_nome', 'Nome fantasia ou razão social'],
              ['empresa_cnpj', 'CNPJ da empresa'],
              ['empresa_telefone', 'Telefone da empresa'],
            ]},
            { group: 'Sistema Solar', items: [
              ['paineis_qtd', 'Quantidade de painéis'],
              ['paineis_potencia', 'Potência do painel (ex: 610W)'],
              ['paineis_marca', 'Marca/modelo do painel'],
              ['inversor_qtd', 'Quantidade de inversores'],
              ['inversor_potencia', 'Potência do inversor'],
              ['inversor_marca', 'Marca/modelo do inversor'],
              ['total_kwp', 'Potência total (ex: 8.54 kWp)'],
              ['geracao_mensal', 'Geração mensal estimada'],
            ]},
            { group: 'Valores', items: [
              ['preco_total', 'Preço total formatado (R$)'],
              ['valor_entrada', 'Valor de entrada (R$)'],
              ['num_parcelas', 'Número de parcelas'],
              ['valor_parcelas', 'Valor de cada parcela (R$)'],
            ]},
            { group: 'Datas', items: [
              ['data_proposta', 'Data de emissão (dd/MM/yyyy)'],
              ['validade_proposta', 'Validade — 15 dias após emissão'],
            ]},
          ].map(({ group, items }) => (
            <div key={group} className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--theme-accent)' }}>
                {group}
              </p>
              {items.map(([tag, desc]) => (
                <div key={tag} className="flex items-baseline gap-2 py-0.5">
                  <code
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(255,208,128,0.1)', color: 'var(--theme-accent)' }}
                  >
                    {`{{${tag}}}`}
                  </code>
                  <span className="text-xs text-white/40">{desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="rounded-xl p-4 border border-white/10 flex items-center justify-between gap-4"
            style={{ background: 'var(--theme-surface)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-white truncate">{t.name}</p>
                {t.is_default && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,208,128,0.15)', color: 'var(--theme-accent)', border: '1px solid rgba(255,208,128,0.3)' }}
                  >
                    Padrão
                  </span>
                )}
                {!t.is_active && (
                  <span className="text-xs px-2 py-0.5 rounded-full text-white/40 border border-white/10">
                    Inativo
                  </span>
                )}
              </div>
              {t.category && (
                <p className="text-xs text-white/40 mt-0.5">{t.category}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleDiagnose(t.id)}
                disabled={diagLoading === t.id}
                className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                style={{ background: 'var(--theme-input-bg)' }}
              >
                {diagLoading === t.id ? 'Analisando...' : '🔍 Diagnóstico'}
              </button>
              <a
                href={`/api/templates/${t.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                style={{ background: 'var(--theme-input-bg)' }}
              >
                ↓ Baixar
              </a>
              {!t.is_default && (
                <button
                  onClick={() => handleSetDefault(t)}
                  disabled={isPending}
                  className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                  style={{ background: 'var(--theme-input-bg)' }}
                >
                  Definir padrão
                </button>
              )}
              <button
                onClick={() => handleToggleActive(t)}
                disabled={isPending}
                className="text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                style={{ background: 'var(--theme-input-bg)' }}
              >
                {t.is_active ? 'Desativar' : 'Ativar'}
              </button>
              {confirmDelete === t.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={isPending}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
                    style={{ background: '#ef4444' }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs px-3 py-1.5 rounded-lg text-white/40"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(t.id)}
                  className="text-xs px-3 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
                  style={{ background: 'var(--theme-input-bg)' }}
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Resultado do Diagnóstico */}
      {diagResult && !diagResult.error && (
        <div
          className="rounded-2xl p-5 border border-white/10 space-y-4"
          style={{ background: 'var(--theme-surface)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Diagnóstico: {diagResult.templateName}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{
                  background: diagResult.status === 'aprovado' ? 'rgba(16,185,129,0.15)' : diagResult.status === 'aprovado_com_alertas' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
                  color: diagResult.status === 'aprovado' ? '#10B981' : diagResult.status === 'aprovado_com_alertas' ? '#FBBF24' : '#EF4444',
                  border: `1px solid ${diagResult.status === 'aprovado' ? 'rgba(16,185,129,0.3)' : diagResult.status === 'aprovado_com_alertas' ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                {diagResult.status === 'aprovado' ? '✓ Aprovado' : diagResult.status === 'aprovado_com_alertas' ? '⚠ Aprovado com alertas' : '✖ Reprovado'}
              </span>
              <button onClick={() => setDiagResult(null)} className="text-xs text-white/30 hover:text-white/60">✕</button>
            </div>
          </div>
          <div className="space-y-1.5">
            {diagResult.findings?.map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="flex-shrink-0 mt-0.5">
                  {f.type === 'ok' ? '✓' : f.type === 'warn' ? '⚠' : '✖'}
                </span>
                <span style={{ color: f.type === 'ok' ? '#10B981' : f.type === 'warn' ? '#FBBF24' : '#EF4444' }}>
                  {f.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {diagResult?.error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          {diagResult.error}
        </p>
      )}
    </div>
  )
}
