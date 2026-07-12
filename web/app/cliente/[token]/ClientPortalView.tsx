'use client'

import { useState, useEffect, use, useMemo } from 'react'

type PortalData = {
  organization: { name: string; logo_url: string | null }
  client: { name: string; city: string | null; state: string | null }
  project: { numero_processo: string | null; status: string | null } | null
  timeline: { key: string; label: string; status: 'concluido' | 'em_andamento' | 'aguardando' | 'pendente'; date?: string | null; endDate?: string | null }[]
  history: { date: string; title: string; description: string; category: string; icon: string }[]
  notices: string[]
  deadline: { start_date: string | null; max_days: number | null }
  financial: {
    sale_value: number | null
    payment_method: string | null
    installments: { position: number; due_date: string | null; amount: number; status: string; confirmed_at: string | null }[]
  } | null
  equipment: {
    modules: { brand: string | null; power_w: number | null; qty: number | null }
    inverters: { brand: string | null; power_w: number | null; qty: number | null }
    total_power_kwp: number | null
  }
  monitoring: { app: string; user: string | null; password: string | null } | null
  documents: { type: string; label: string; url: string }[]
  projectDocs: { name: string; url: string }[]
  photos: { name: string; url: string }[]
}

const STATUS_ICON: Record<string, string> = {
  concluido: '🟢',
  em_andamento: '🟡',
  aguardando: '⚪',
  pendente: '🔴',
}

const HISTORY_CATEGORIES = [
  { key: 'all', label: 'Todos' },
  { key: 'documentacao', label: 'Documentação' },
  { key: 'projeto', label: 'Projeto' },
  { key: 'aprovacao', label: 'Aprovação' },
  { key: 'instalacao', label: 'Instalação' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'homologacao', label: 'Homologação' },
]

function Card({ icon, title, children, className }: { icon: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className ?? ''}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right font-medium">{String(value)}</span>
    </div>
  )
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('pt-BR')
  } catch { return d }
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return ''
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ClientPortalView({ paramsPromise }: { paramsPromise: Promise<{ token: string }> }) {
  const { token } = use(paramsPromise)
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [historyFilter, setHistoryFilter] = useState('all')
  const [historyAsc, setHistoryAsc] = useState(false)

  useEffect(() => {
    fetch(`/api/cliente/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Link inválido')
        return r.json()
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((e) => { setError(e.message); setLoading(false) })
  }, [token])

  const filteredHistory = useMemo(() => {
    if (!data) return []
    let items = data.history
    if (historyFilter !== 'all') items = items.filter(e => e.category === historyFilter)
    if (historyAsc) items = [...items].reverse()
    return items
  }, [data, historyFilter, historyAsc])

  async function handleDownloadZip() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/cliente/${token}/zip`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'meus_documentos.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Erro ao baixar. Tente novamente.') }
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Carregando seu portal...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-lg font-semibold text-gray-800 mb-2">Link inválido</h1>
          <p className="text-sm text-gray-500">{error ?? 'Este link não existe ou foi invalidado.'}</p>
        </div>
      </div>
    )
  }

  const { organization, client, project, timeline, notices, deadline, financial, equipment, monitoring, documents, projectDocs, photos, latestReceipt } = data
  const hasEquipment = equipment.modules.brand || equipment.modules.qty || equipment.inverters.brand
  const allDocs = [...documents, ...projectDocs.map(d => ({ type: 'projeto', label: d.name, url: d.url }))]

  // Deadline calc
  const startDate = deadline.start_date ? new Date(deadline.start_date) : null
  const maxDays = deadline.max_days ?? 0
  const diasDecorridos = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86400000) : 0
  const diasRestantes = maxDays > 0 ? Math.max(0, maxDays - diasDecorridos) : null
  const progressPct = maxDays > 0 ? Math.min(100, (diasDecorridos / maxDays) * 100) : 0
  const atrasado = maxDays > 0 && diasDecorridos > maxDays

  // Overdue installments
  const now = new Date()
  const overdueCount = financial?.installments.filter(i =>
    i.status !== 'confirmada' && i.status !== 'pago' && i.due_date && new Date(i.due_date) < now
  ).length ?? 0

  const completedStages = timeline.filter(s => s.status === 'concluido').length
  const timelineProgress = timeline.length > 0 ? Math.round((completedStages / timeline.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {organization.logo_url ? (
            <img src={organization.logo_url} alt={organization.name} className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">IS</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{organization.name}</p>
            <p className="text-sm font-semibold text-gray-800 truncate">{client.name}</p>
          </div>
          {project?.numero_processo && (
            <span className="text-xs text-gray-400 flex-shrink-0">#{project.numero_processo}</span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Avisos */}
        {notices.length > 0 && (
          <div className="space-y-2">
            {notices.map((notice, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-base flex-shrink-0">📢</span>
                <p className="text-sm text-amber-800">{notice}</p>
              </div>
            ))}
          </div>
        )}

        {/* Andamento */}
        <Card icon="📈" title="Andamento do Projeto">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Progresso geral</span>
              <span className="text-xs font-semibold text-green-700">{timelineProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${timelineProgress}%` }} />
            </div>
          </div>
          <div className="space-y-0">
            {timeline.map((stage, i) => (
              <div key={stage.key} className="flex items-start gap-3 relative">
                {/* Vertical line */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <span className="text-sm leading-none">{STATUS_ICON[stage.status]}</span>
                  {i < timeline.length - 1 && (
                    <div className="w-px flex-1 min-h-[24px]" style={{ background: stage.status === 'concluido' ? '#10B981' : '#E5E7EB' }} />
                  )}
                </div>
                <div className="pb-3 min-w-0 flex-1">
                  <p className={`text-sm font-medium ${stage.status === 'concluido' ? 'text-gray-800' : stage.status === 'em_andamento' ? 'text-yellow-700' : 'text-gray-400'}`}>
                    {stage.label}
                  </p>
                  {stage.date && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(stage.date)}{stage.endDate ? ` → ${fmtDate(stage.endDate)}` : ''}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Prazos */}
        {startDate && maxDays > 0 && (
          <Card icon="📅" title="Prazos">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-[11px] text-gray-500">Início</p>
                  <p className="text-sm font-semibold text-gray-800">{fmtDate(deadline.start_date)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-[11px] text-gray-500">Previsão</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {new Date(startDate.getTime() + maxDays * 86400000).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">{diasDecorridos} de {maxDays} dias</span>
                  <span className={`text-xs font-semibold ${atrasado ? 'text-red-600' : 'text-green-600'}`}>
                    {atrasado ? `${diasDecorridos - maxDays} dias de atraso` : `${diasRestantes} dias restantes`}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${atrasado ? 'bg-red-500' : progressPct >= 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, progressPct)}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Financeiro */}
        {financial && (
          <Card icon="💰" title="Financeiro">
            <div className="space-y-3">
              {overdueCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <p className="text-sm text-red-700 font-medium">
                    ⚠️ Você possui {overdueCount} parcela(s) em atraso.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-[11px] text-green-600">Valor total</p>
                  <p className="text-base font-bold text-green-800">{fmtCurrency(financial.sale_value)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
                  <p className="text-[11px] text-gray-500">Forma de pagamento</p>
                  <p className="text-sm font-semibold text-gray-800">{financial.payment_method ?? '—'}</p>
                </div>
              </div>
              {financial.installments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parcelas</p>
                  {financial.installments.map((inst) => {
                    const isOverdue = inst.status !== 'confirmada' && inst.status !== 'pago' && inst.due_date && new Date(inst.due_date) < now
                    const isPaid = inst.status === 'confirmada' || inst.status === 'pago'
                    return (
                      <div key={inst.position} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${isOverdue ? 'border-red-200 bg-red-50' : isPaid ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {inst.position === 1 ? 'Entrada' : `Parcela ${inst.position}`}
                          </p>
                          <p className="text-[11px] text-gray-400">Venc: {fmtDate(inst.due_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-800">{fmtCurrency(inst.amount)}</p>
                          <span className={`text-[11px] font-medium ${isPaid ? 'text-green-600' : isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
                            {isPaid ? '🟢 Pago' : isOverdue ? '🔴 Em atraso' : '🟡 A vencer'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Documentos */}
        {allDocs.length > 0 && (
          <Card icon="📄" title="Meus Documentos">
            <div className="space-y-1">
              {allDocs.map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">{doc.label}</span>
                  <span className="text-xs text-green-600 font-medium">Visualizar ↗</span>
                </a>
              ))}
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {downloading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gerando ZIP...</>
                ) : (
                  <>📦 Baixar todos os documentos (.ZIP)</>
                )}
              </button>
            </div>
          </Card>
        )}

        {/* Recibo de Pagamento */}
        {latestReceipt && (
          <Card icon="🧾" title="Recibo de Pagamento">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Versão {latestReceipt.version}</span>
                <span className="text-gray-500">{new Date(latestReceipt.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Total pago</p>
                  <p className="text-lg font-bold text-green-700">
                    {latestReceipt.total_paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-xs text-gray-500">
                Comprovante oficial atualizado com todos os pagamentos realizados até a data de emissão.
              </p>
              <div className="flex gap-2">
                <a
                  href={`/api/recibos/${latestReceipt.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl text-center hover:bg-green-700 transition-colors"
                >
                  📄 Visualizar Recibo
                </a>
                <a
                  href={`/api/recibos/${latestReceipt.token}`}
                  download="recibo.pdf"
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl text-center hover:bg-gray-200 transition-colors"
                >
                  ⬇ Baixar PDF
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Fotos */}
        {photos.length > 0 && (
          <Card icon="📷" title="Fotos da Instalação">
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxUrl(photo.url)}
                  className="relative rounded-xl overflow-hidden aspect-square bg-gray-100 group cursor-pointer"
                >
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-lg transition-opacity">🔍</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Equipamentos */}
        {hasEquipment && (
          <Card icon="⚡" title="Equipamentos">
            <div className="space-y-2">
              {equipment.total_power_kwp && (
                <div className="bg-green-50 rounded-xl px-3 py-2 text-center mb-2">
                  <p className="text-xs text-green-600">Potência total do sistema</p>
                  <p className="text-xl font-bold text-green-800">{equipment.total_power_kwp} kWp</p>
                </div>
              )}
              {(equipment.modules.brand || equipment.modules.qty) && (
                <>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Módulos Fotovoltaicos</p>
                  <InfoRow label="Marca / Modelo" value={equipment.modules.brand} />
                  <InfoRow label="Potência" value={equipment.modules.power_w ? `${equipment.modules.power_w}W` : null} />
                  <InfoRow label="Quantidade" value={equipment.modules.qty} />
                </>
              )}
              {(equipment.inverters.brand || equipment.inverters.qty) && (
                <>
                  <div className="border-t border-gray-100 my-2" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inversores</p>
                  <InfoRow label="Marca / Modelo" value={equipment.inverters.brand} />
                  <InfoRow label="Potência" value={equipment.inverters.power_w ? `${equipment.inverters.power_w}kW` : null} />
                  <InfoRow label="Quantidade" value={equipment.inverters.qty} />
                </>
              )}
            </div>
          </Card>
        )}

        {/* Monitoramento */}
        {monitoring && (
          <Card icon="📱" title="Aplicativo de Monitoramento">
            <div className="space-y-2">
              <InfoRow label="Aplicativo" value={monitoring.app} />
              <InfoRow label="Usuário" value={monitoring.user} />
              <InfoRow label="Senha" value={monitoring.password} />
            </div>
          </Card>
        )}

        {/* Histórico */}
        {filteredHistory.length > 0 && (
          <Card icon="📋" title="Histórico do Projeto">
            <div className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-1.5">
                {HISTORY_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setHistoryFilter(cat.key)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${historyFilter === cat.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                  >
                    {cat.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setHistoryAsc(v => !v)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 ml-auto"
                >
                  {historyAsc ? '↑ Antigos primeiro' : '↓ Recentes primeiro'}
                </button>
              </div>
              {/* Events */}
              <div className="space-y-0">
                {filteredHistory.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 relative">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <span className="text-sm leading-none">{event.icon}</span>
                      {i < filteredHistory.length - 1 && <div className="w-px flex-1 min-h-[24px] bg-gray-200" />}
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                      <p className="text-[11px] text-gray-400">{fmtDate(event.date)}</p>
                      <p className="text-sm font-medium text-gray-800">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">{organization.name} — Portal do Cliente</p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-2" onClick={() => setLightboxUrl(null)}>
          <button type="button" className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl" onClick={() => setLightboxUrl(null)}>✕</button>
          <img src={lightboxUrl} alt="Foto ampliada" className="max-w-full max-h-[95vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
