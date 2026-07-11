// web/app/(dashboard)/clientes/[id]/tabs/Tab8PastaCompleta.tsx
'use client'

import { useState, useEffect } from 'react'
import type { Client } from '@/lib/clients/types'
import { ATTACHMENT_TYPE_LABELS } from '@/lib/clients/types'
import { formatCurrency, formatDate, formatPhone, formatCpfCnpj } from '@/lib/format'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import { secureStorageUrl } from '@/lib/storage/url'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--theme-accent)' }}>{title}</p>
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, href }: { label: string; value?: string | number | boolean | React.ReactNode | null; href?: string }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : typeof value === 'string' || typeof value === 'number' ? String(value) : value
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs flex-shrink-0 w-44" style={{ color: 'var(--theme-text-subtle)' }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm flex-1 underline" style={{ color: 'var(--theme-accent)' }}>{display}</a>
      ) : (
        <span className="text-sm flex-1" style={{ color: 'var(--theme-text)' }}>{display}</span>
      )}
    </div>
  )
}

function DocLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
      <a href={secureStorageUrl(url) ?? '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}>
        <ExternalLink size={11} /> ver
      </a>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    confirmada: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    pendente: { bg: 'rgba(255,200,100,0.12)', color: 'var(--theme-accent)' },
    aguardando: { bg: 'rgba(255,200,100,0.12)', color: 'var(--theme-accent)' },
    enviado: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
    aprovado: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    concluida: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    entregue: { bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
    em_andamento: { bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
    atrasada: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444' },
  }
  const c = colors[status] ?? { bg: 'var(--theme-input-bg)', color: 'var(--theme-text-muted)' }
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>{status}</span>
}

type PipelineData = {
  project: any | null
  purchase: any | null
  delivery: any | null
  obra: any | null
  obraDelivery: any | null
  posObra: any | null
}

export function Tab8PastaCompleta({ client }: { client: Client }) {
  const [data, setData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/clients/${client.id}/full-data`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [client.id])

  const fmtDate = (d: string | null) => d ? formatDate(d) : null

  // Prazo
  const startDate = client.delivery_start_date ? new Date(client.delivery_start_date) : null
  const maxDays = client.contract_max_days ?? 0
  const diasDecorridos = startDate ? Math.floor((Date.now() - startDate.getTime()) / 86400000) : 0
  const diasRestantes = maxDays > 0 ? maxDays - diasDecorridos : null
  const atrasado = diasRestantes !== null && diasRestantes < 0

  return (
    <div className="flex flex-col gap-6 max-w-3xl pb-8">
      {/* 1. Dados Gerais */}
      <Section title="Dados Gerais">
        <Row label="Tipo" value={client.type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'} />
        <Row label="Nome" value={client.name} />
        <Row label="CPF/CNPJ" value={client.cpf_cnpj ? formatCpfCnpj(client.cpf_cnpj) : null} />
        <Row label="Email" value={client.email} />
        <Row label="Telefone" value={client.phone ? formatPhone(client.phone) : null} />
        <Row label="Endereço" value={[client.street, client.number, client.neighborhood, client.city, client.state].filter(Boolean).join(', ')} />
        <Row label="CEP" value={client.zip} />
        <Row label="Coordenadas Google Maps" value={client.maps_coordinates} />
        {client.maps_coordinates && (
          <Row
            label=""
            value="Abrir no Google Maps ↗"
            href={`https://www.google.com/maps?q=${encodeURIComponent(client.maps_coordinates)}`}
          />
        )}
        <div className="border-t border-white/[0.06] my-2" />
        <Row label="kWh prometido/mês" value={client.promised_kwh} />
        <Row label="Potência do sistema" value={client.system_power_kwp ? `${client.system_power_kwp} kWp` : null} />
        <Row label="Painel" value={[client.panel_brand, client.panel_power_w ? `${client.panel_power_w}W` : null].filter(Boolean).join(' ')} />
        <Row label="Inversor" value={[client.inverter_brand, client.inverter_power_w ? `${client.inverter_power_w}kW` : null].filter(Boolean).join(' ')} />
      </Section>

      {/* 2. Vistoria */}
      <Section title="Vistoria">
        <Row label="Tipo de telhado" value={client.roof_type} />
        <Row label="Orientação" value={client.roof_orientation} />
        <Row label="Coordenadas" value={client.maps_coordinates} />
        <Row label="Disjuntor entrada" value={client.entry_breaker} />
        <Row label="Cabo entrada" value={client.entry_cable_mm} />
        <Row label="Obras de adaptação" value={client.has_adaptation_works} />
        <Row label="Vistoria realizada" value={client.inspection_done} />
        <Row label="Observações" value={client.client_notes} />
        <Row label="Promessas extras" value={client.extra_promises} />
      </Section>

      {/* 3. Financeiro */}
      {client.sale && (
        <Section title="Financeiro">
          <Row label="Valor da venda" value={formatCurrency(client.sale.sale_value)} />
          <Row label="Forma de pagamento" value={client.sale.payment_method} />
          <Row label="Comissão" value={client.sale.commission_pct ? `${client.sale.commission_pct}%` : null} />
          <Row label="Obs. NF" value={client.sale.nf_notes} />
          {client.installments.length > 0 && (
            <div className="mt-2">
              <span className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Parcelas</span>
              <div className="mt-1.5 space-y-1.5">
                {client.installments.sort((a, b) => a.position - b.position).map((inst) => (
                  <div key={inst.id} className="flex items-center gap-3 text-sm rounded-lg px-3 py-2" style={{ background: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}>
                    <span className="w-24 flex-shrink-0 font-medium">{inst.position === 1 ? 'Entrada' : `Parcela ${inst.position}`}</span>
                    <span className="w-24">Venc: {fmtDate(inst.due_date)}</span>
                    <span className="w-28">{formatCurrency(inst.amount)}</span>
                    <StatusBadge status={inst.status} />
                    {(inst as any).confirmed_at && <span className="text-xs text-white/30">Pago: {fmtDate((inst as any).confirmed_at)}</span>}
                    {(inst as any).receipt_url && (
                      <a href={secureStorageUrl((inst as any).receipt_url) ?? '#'} target="_blank" rel="noopener noreferrer" className="text-xs ml-auto" style={{ color: 'var(--theme-accent)' }}>Comprovante</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* 4. Prazos */}
      <Section title="Prazos">
        <Row label="Data do contrato" value={fmtDate(client.contract_date)} />
        <Row label="Início do prazo" value={fmtDate(client.delivery_start_date)} />
        <Row label="Prazo máximo" value={maxDays ? `${maxDays} dias` : null} />
        <Row label="Dias decorridos" value={startDate ? `${diasDecorridos} dias` : null} />
        {diasRestantes !== null && (
          <div className="flex items-start gap-3">
            <span className="text-xs flex-shrink-0 w-44" style={{ color: 'var(--theme-text-subtle)' }}>Dias restantes</span>
            <span className="text-sm font-semibold" style={{ color: atrasado ? '#EF4444' : '#10B981' }}>
              {atrasado ? `${Math.abs(diasRestantes)} dias de atraso` : `${diasRestantes} dias`}
            </span>
          </div>
        )}
      </Section>

      {/* 5. Contrato */}
      {client.contract && (
        <Section title="Contrato">
          <Row label="Assinado" value={client.contract.signed} />
          <Row label="Data assinatura" value={(client.contract as any).signed_at ? fmtDate((client.contract as any).signed_at) : null} />
          <DocLink label="Contrato" url={client.contract.contract_url} />
          <DocLink label="Procuração" url={client.contract.power_of_attorney_url} />
        </Section>
      )}

      {loading && <p className="text-sm text-white/30 text-center py-4">Carregando dados do pipeline...</p>}

      {data && (
        <>
          {/* 6. Projeto */}
          {data.project && (
            <Section title="Projeto">
              <Row label="Responsável técnico" value={data.project.responsavel_nome} />
              <Row label="Nº do processo" value={data.project.numero_processo} />
              <Row label="Data protocolo" value={fmtDate(data.project.data_protocolo)} />
              <Row label="Prazo protocolo" value={fmtDate(data.project.prazo_protocolo)} />
              <Row label="Solicitação vistoria" value={fmtDate(data.project.data_solicitacao_vistoria)} />
              <Row label="Prazo vistoria" value={fmtDate(data.project.prazo_vistoria)} />
              <Row label="Status" value={data.project.status} />
              <DocLink label="ART" url={data.project.art_url} />
              <DocLink label="Projeto" url={data.project.projeto_url} />
              <DocLink label="Parecer de acesso" url={data.project.parecer_acesso_url} />
            </Section>
          )}

          {/* 7. Compras */}
          {data.purchase && (
            <Section title="Compras">
              <Row label="Fornecedor" value={data.purchase.fornecedor} />
              <Row label="Itens" value={data.purchase.itens} />
              <Row label="Valor" value={data.purchase.valor ? formatCurrency(data.purchase.valor) : null} />
              <Row label="Data prevista" value={fmtDate(data.purchase.data_prevista)} />
              <Row label="Status" value={data.purchase.status} />
              <DocLink label="NF Equipamentos" url={data.purchase.nf_equipamentos_url} />
              <DocLink label="Romaneio" url={data.purchase.romaneio_url} />
              <DocLink label="Comprovante" url={data.purchase.comprovante_url} />
            </Section>
          )}

          {/* 8. Entrega do Material */}
          {data.delivery && (
            <Section title="Entrega do Material">
              <Row label="Data de entrega" value={fmtDate(data.delivery.data_entrega)} />
              <Row label="Status" value={data.delivery.status} />
              {(() => {
                const checklist = data.delivery.checklist ?? {}
                return Object.entries(checklist).map(([key, val]) => (
                  <Row key={key} label={key.replace(/_/g, ' ')} value={val as boolean} />
                ))
              })()}
              {(() => {
                try {
                  const urls: string[] = JSON.parse(data.delivery.media_urls ?? '[]')
                  if (urls.length === 0) return null
                  return (
                    <div className="mt-2">
                      <span className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Fotos / Vídeos</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                        {urls.map((url, i) => (
                          <a key={i} href={secureStorageUrl(url) ?? '#'} target="_blank" rel="noopener noreferrer" className="rounded-lg overflow-hidden" style={{ aspectRatio: '1', background: 'var(--theme-surface)', border: '1px solid var(--theme-card-border)', position: 'relative', display: 'block' }}>
                            {/\.(mp4|mov|webm)$/i.test(url) ? (
                              <div className="w-full h-full flex items-center justify-center text-white/30">▶</div>
                            ) : secureStorageUrl(url) ? (
                              <Image src={secureStorageUrl(url)!} alt={`Entrega ${i + 1}`} fill className="object-cover" />
                            ) : null}
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}
            </Section>
          )}

          {/* 9. Obra */}
          {data.obra && (
            <Section title="Obra">
              <Row label="Data de início" value={fmtDate(data.obra.data_inicio)} />
              <Row label="Data prevista" value={fmtDate(data.obra.data_prevista)} />
              <Row label="Equipe" value={data.obra.equipe_nome} />
              <Row label="Status" value={data.obra.status} />
              {client.has_adaptation_works && (
                <>
                  <div className="border-t border-white/[0.06] my-2" />
                  <span className="text-xs" style={{ color: 'var(--theme-text-subtle)' }}>Adaptações</span>
                  {(() => {
                    try {
                      const adaptations: string[] = JSON.parse((client as any).adaptation_details ?? '[]')
                      return adaptations.map((a, i) => <Row key={i} label={`${i + 1}.`} value={a} />)
                    } catch { return null }
                  })()}
                </>
              )}
            </Section>
          )}

          {/* 10. Entrega da Obra + Monitoramento */}
          {data.obraDelivery && (
            <Section title="Entrega da Obra">
              <Row label="Data de entrega" value={fmtDate(data.obraDelivery.data_entrega)} />
              <Row label="Status" value={data.obraDelivery.status} />
              <Row label="Observações" value={data.obraDelivery.observacoes} />
              {(() => {
                const checklist = data.obraDelivery.checklist ?? {}
                return Object.entries(checklist).map(([key, val]) => (
                  <Row key={key} label={key.replace(/_/g, ' ')} value={val as boolean} />
                ))
              })()}
              {(data.obraDelivery.monitor_app || data.obraDelivery.monitor_user) && (
                <>
                  <div className="border-t border-white/[0.06] my-2" />
                  <span className="text-xs font-semibold" style={{ color: 'var(--theme-text-subtle)' }}>Monitoramento</span>
                  <Row label="App" value={data.obraDelivery.monitor_app} />
                  <Row label="Usuário" value={data.obraDelivery.monitor_user} />
                  <Row label="Senha" value={data.obraDelivery.monitor_pass} />
                </>
              )}
            </Section>
          )}

          {/* 11. Pós-Obra */}
          {data.posObra && (
            <Section title="Pós-Obra">
              <Row label="Data de contato" value={fmtDate(data.posObra.data_contato)} />
              <Row label="NPS" value={data.posObra.nps != null ? `${data.posObra.nps}/10` : null} />
              <Row label="Observações" value={data.posObra.observacoes} />
              <Row label="Status" value={data.posObra.status} />
            </Section>
          )}
        </>
      )}

      {/* 12. Documentos e Anexos (consolidado) */}
      {(client.attachments.length > 0 || client.contract || data?.project || data?.purchase) && (
        <Section title="Documentos e Anexos">
          {client.attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text-muted)' }}>Cadastro</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{ATTACHMENT_TYPE_LABELS[att.type] ?? att.type}</span>
              </div>
              <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}>
                <ExternalLink size={11} /> ver
              </a>
            </div>
          ))}
          {client.contract?.contract_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text-muted)' }}>Contrato</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Contrato assinado</span>
              </div>
              <a href={client.contract.contract_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
          {client.contract?.power_of_attorney_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--theme-input-bg)', color: 'var(--theme-text-muted)' }}>Contrato</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Procuração</span>
              </div>
              <a href={client.contract.power_of_attorney_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
          {data?.project?.art_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>Projeto</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>ART</span>
              </div>
              <a href={data.project.art_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
          {data?.project?.projeto_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>Projeto</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Projeto elétrico</span>
              </div>
              <a href={data.project.projeto_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
          {data?.project?.parecer_acesso_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>Projeto</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Parecer de acesso</span>
              </div>
              <a href={data.project.parecer_acesso_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
          {data?.purchase?.nf_equipamentos_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,160,60,0.12)', color: '#EF9F27' }}>Compras</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>NF Equipamentos</span>
              </div>
              <a href={data.purchase.nf_equipamentos_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
          {data?.purchase?.romaneio_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,160,60,0.12)', color: '#EF9F27' }}>Compras</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Romaneio</span>
              </div>
              <a href={data.purchase.romaneio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
          {data?.purchase?.comprovante_url && (
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,160,60,0.12)', color: '#EF9F27' }}>Compras</span>
                <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Comprovante</span>
              </div>
              <a href={data.purchase.comprovante_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs" style={{ color: 'var(--theme-accent)' }}><ExternalLink size={11} /> ver</a>
            </div>
          )}
        </Section>
      )}
    </div>
  )
}
