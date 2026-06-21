'use client'

import { useState, useTransition } from 'react'
import type { OrgConfig, LeadOrigin } from '@/lib/configuracoes/queries'
import { saveOrgConfig, addLeadOrigin, removeLeadOrigin } from '@/lib/configuracoes/actions'
import { CpfCnpjInput, PhoneInput, CepInput, CurrencyInput } from '@/components/ui/inputs'

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/60'
const labelCls = 'block text-xs text-white/50 mb-1'
const cardCls = 'rounded-2xl border border-white/10 p-5 space-y-4'
const cardStyle = { background: 'var(--theme-surface)' }
const saveBtnCls =
  'px-5 py-2 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50'
const saveBtnStyle = { background: 'var(--theme-accent)', color: 'var(--theme-accent-text)' }

function SectionFeedback({ result }: { result: { error?: string; success?: string } | null }) {
  if (!result) return null
  if (result.error)
    return <p className="text-red-400 text-xs mt-1">{result.error}</p>
  if (result.success)
    return <p className="text-green-400 text-xs mt-1">{result.success}</p>
  return null
}

export default function EmpresaTab({
  config,
  origins: initialOrigins,
}: {
  config: OrgConfig
  origins: LeadOrigin[]
}) {
  // ── Section 1: Dados da Empresa ──────────────────────────────────────────
  const [empresa, setEmpresa] = useState({
    razao_social: config.razao_social ?? '',
    nome_fantasia: config.nome_fantasia ?? '',
    cnpj: config.cnpj ?? '',
    email: config.email ?? '',
    telefone: config.telefone ?? '',
    cep: config.cep ?? '',
    endereco: config.endereco ?? '',
    bairro: config.bairro ?? '',
    numero: config.numero ?? '',
    cidade: config.cidade ?? '',
    estado: config.estado ?? '',
    concessionaria: config.concessionaria ?? '',
  })
  const [empresaPending, startEmpresa] = useTransition()
  const [empresaResult, setEmpresaResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 2: Dados para Cálculo ────────────────────────────────────────
  const [calculo, setCalculo] = useState({
    kwh_por_kwp: config.kwh_por_kwp?.toString() ?? '',
    valor_projeto_por_kwp: config.valor_projeto_por_kwp?.toString() ?? '',
    valor_instalacao_por_placa: config.valor_instalacao_por_placa?.toString() ?? '',
    pct_material_ca: config.pct_material_ca?.toString() ?? '',
    quilometragem: config.quilometragem?.toString() ?? '',
    pct_comissao: config.pct_comissao?.toString() ?? '',
    pct_imposto: config.pct_imposto?.toString() ?? '',
    pct_margem: config.pct_margem?.toString() ?? '',
  })
  const [calculoPending, startCalculo] = useTransition()
  const [calculoResult, setCalculoResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 3: Dados Bancários ────────────────────────────────────────────
  const [banco, setBanco] = useState({
    banco: config.banco ?? '',
    agencia: config.agencia ?? '',
    conta: config.conta ?? '',
    tipo_chave_pix: config.tipo_chave_pix ?? 'CPF',
    pix: config.pix ?? '',
  })
  const [bancoPending, startBanco] = useTransition()
  const [bancoResult, setBancoResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 4: Meta Anual + Prazo Padrão ──────────────────────────────────
  const [meta, setMeta] = useState<number>(config.meta_anual ?? 0)
  const [prazoPadrao, setPrazoPadrao] = useState<number>((config as any).prazo_padrao_contrato ?? 60)
  const [metaPending, startMeta] = useTransition()
  const [metaResult, setMetaResult] = useState<{ error?: string; success?: string } | null>(null)

  // ── Section 5: Origens de Lead ────────────────────────────────────────────
  const [origins, setOrigins] = useState<LeadOrigin[]>(initialOrigins)
  const [newOrigin, setNewOrigin] = useState('')
  const [originsPending, startOrigins] = useTransition()

  // helpers
  const toNum = (v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? null : n
  }

  function handleSaveEmpresa() {
    setEmpresaResult(null)
    startEmpresa(async () => {
      const res = await saveOrgConfig(empresa)
      setEmpresaResult(res)
    })
  }

  function handleSaveCalculo() {
    setCalculoResult(null)
    startCalculo(async () => {
      const res = await saveOrgConfig({
        kwh_por_kwp: toNum(calculo.kwh_por_kwp),
        valor_projeto_por_kwp: toNum(calculo.valor_projeto_por_kwp),
        valor_instalacao_por_placa: toNum(calculo.valor_instalacao_por_placa),
        pct_material_ca: toNum(calculo.pct_material_ca),
        quilometragem: toNum(calculo.quilometragem),
        pct_comissao: toNum(calculo.pct_comissao),
        pct_imposto: toNum(calculo.pct_imposto),
        pct_margem: toNum(calculo.pct_margem),
      })
      setCalculoResult(res)
    })
  }

  function handleSaveBanco() {
    setBancoResult(null)
    startBanco(async () => {
      const res = await saveOrgConfig(banco)
      setBancoResult(res)
    })
  }

  function handleSaveMeta() {
    setMetaResult(null)
    startMeta(async () => {
      const res = await saveOrgConfig({ meta_anual: meta || null, prazo_padrao_contrato: prazoPadrao || 60 })
      setMetaResult(res)
    })
  }

  function handleAddOrigin() {
    if (!newOrigin.trim()) return
    startOrigins(async () => {
      const res = await addLeadOrigin(newOrigin)
      if (res.success) {
        // optimistically add with temp id; revalidation will refresh
        setOrigins((prev) => [...prev, { id: crypto.randomUUID(), name: newOrigin.trim() }])
        setNewOrigin('')
      }
    })
  }

  function handleRemoveOrigin(id: string) {
    startOrigins(async () => {
      const res = await removeLeadOrigin(id)
      if (res.success) {
        setOrigins((prev) => prev.filter((o) => o.id !== id))
      }
    })
  }

  const metaNum = meta || 0

  return (
    <div className="space-y-6">
      {/* ── 1. Dados da Empresa ──────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Dados da Empresa</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Razão Social</label>
            <input
              className={inputCls}
              value={empresa.razao_social}
              onChange={(e) => setEmpresa((p) => ({ ...p, razao_social: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Nome Fantasia</label>
            <input
              className={inputCls}
              value={empresa.nome_fantasia}
              onChange={(e) => setEmpresa((p) => ({ ...p, nome_fantasia: e.target.value }))}
            />
          </div>
          <div>
            <CpfCnpjInput
              label="CNPJ"
              value={empresa.cnpj}
              onChange={(v) => setEmpresa((p) => ({ ...p, cnpj: v }))}
            />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input
              className={inputCls}
              type="email"
              value={empresa.email}
              onChange={(e) => setEmpresa((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div>
            <PhoneInput
              label="Telefone"
              value={empresa.telefone}
              onChange={(v) => setEmpresa((p) => ({ ...p, telefone: v }))}
            />
          </div>
          <div>
            <CepInput
              label="CEP"
              value={empresa.cep}
              onChange={(v) => setEmpresa((p) => ({ ...p, cep: v }))}
            />
          </div>
          <div>
            <label className={labelCls}>Endereço</label>
            <input
              className={inputCls}
              value={empresa.endereco}
              onChange={(e) => setEmpresa((p) => ({ ...p, endereco: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Bairro</label>
            <input
              className={inputCls}
              value={empresa.bairro}
              onChange={(e) => setEmpresa((p) => ({ ...p, bairro: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Número</label>
            <input
              className={inputCls}
              value={empresa.numero}
              onChange={(e) => setEmpresa((p) => ({ ...p, numero: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Cidade</label>
            <input
              className={inputCls}
              value={empresa.cidade}
              onChange={(e) => setEmpresa((p) => ({ ...p, cidade: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <input
              className={inputCls}
              value={empresa.estado}
              onChange={(e) => setEmpresa((p) => ({ ...p, estado: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Concessionária</label>
            <input
              className={inputCls}
              value={empresa.concessionaria}
              onChange={(e) => setEmpresa((p) => ({ ...p, concessionaria: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={saveBtnCls}
            style={saveBtnStyle}
            disabled={empresaPending}
            onClick={handleSaveEmpresa}
          >
            {empresaPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={empresaResult} />
        </div>
      </div>

      {/* ── 2. Dados para Cálculo ────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Dados para Cálculo</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'kwh_por_kwp', label: 'Geração kWh/kWp' },
            { key: 'valor_projeto_por_kwp', label: 'Valor do projeto por kWp (R$)' },
            { key: 'valor_instalacao_por_placa', label: 'Valor instalação por placa (R$)' },
            { key: 'pct_material_ca', label: 'Material CA (% sobre kit)' },
            { key: 'quilometragem', label: 'Quilometragem (R$/km)' },
            { key: 'pct_comissao', label: 'Comissão (%)' },
            { key: 'pct_imposto', label: 'Imposto (%)' },
            { key: 'pct_margem', label: 'Margem de lucro (%)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                value={calculo[key as keyof typeof calculo]}
                onChange={(e) =>
                  setCalculo((p) => ({ ...p, [key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            className={saveBtnCls}
            style={saveBtnStyle}
            disabled={calculoPending}
            onClick={handleSaveCalculo}
          >
            {calculoPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={calculoResult} />
        </div>
      </div>

      {/* ── 3. Dados Bancários ───────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Dados Bancários</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Banco</label>
            <input
              className={inputCls}
              value={banco.banco}
              onChange={(e) => setBanco((p) => ({ ...p, banco: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Agência</label>
            <input
              className={inputCls}
              value={banco.agencia}
              onChange={(e) => setBanco((p) => ({ ...p, agencia: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Conta</label>
            <input
              className={inputCls}
              value={banco.conta}
              onChange={(e) => setBanco((p) => ({ ...p, conta: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>Tipo de Chave PIX</label>
            <select
              className={inputCls}
              value={banco.tipo_chave_pix}
              onChange={(e) => setBanco((p) => ({ ...p, tipo_chave_pix: e.target.value }))}
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="E-mail">E-mail</option>
              <option value="Telefone">Telefone</option>
              <option value="Aleatória">Aleatória</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>PIX</label>
            <input
              className={inputCls}
              value={banco.pix}
              onChange={(e) => setBanco((p) => ({ ...p, pix: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={saveBtnCls}
            style={saveBtnStyle}
            disabled={bancoPending}
            onClick={handleSaveBanco}
          >
            {bancoPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={bancoResult} />
        </div>
      </div>

      {/* ── 4. Meta Anual + Prazo Padrão ─────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Meta e Prazo</h2>

        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <CurrencyInput
            label="Meta anual (R$)"
            value={meta}
            onChange={(v) => setMeta(v)}
          />
          <div>
            <label className={labelCls}>Prazo padrão do contrato (dias)</label>
            <input
              type="number"
              min="1"
              value={prazoPadrao}
              onChange={(e) => setPrazoPadrao(parseInt(e.target.value) || 60)}
              className={inputCls}
              placeholder="Ex: 60"
            />
            <p className="text-[10px] mt-1" style={{ color: 'var(--theme-text-subtle)' }}>Usado como padrão em novos contratos</p>
          </div>
        </div>

        {metaNum > 0 && (
          <p className="text-white/60 text-sm">
            Meta mensal:{' '}
            <span className="text-white font-medium">
              {(metaNum / 12).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            className={saveBtnCls}
            style={saveBtnStyle}
            disabled={metaPending}
            onClick={handleSaveMeta}
          >
            {metaPending ? 'Salvando...' : 'Salvar'}
          </button>
          <SectionFeedback result={metaResult} />
        </div>
      </div>

      {/* ── 5. Origens de Lead ───────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <h2 className="text-base font-semibold text-white">Origens de Lead</h2>

        {origins.length === 0 ? (
          <p className="text-white/40 text-sm">Nenhuma origem cadastrada.</p>
        ) : (
          <ul className="space-y-2">
            {origins.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <span className="text-white text-sm">{o.name}</span>
                <button
                  className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                  disabled={originsPending}
                  onClick={() => handleRemoveOrigin(o.id)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            className={inputCls}
            placeholder="Nova origem..."
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddOrigin()}
          />
          <button
            className={`${saveBtnCls} whitespace-nowrap`}
            style={saveBtnStyle}
            disabled={originsPending || !newOrigin.trim()}
            onClick={handleAddOrigin}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
