'use client'
import { useState, useTransition } from 'react'
import {
  createPainel, updatePainel, deletePainel,
  createInversor, updateInversor, deleteInversor,
  createBateria, updateBateria, deleteBateria,
} from '@/lib/simuladores/equipamentos/equipamentos-actions'
import {
  TIPOS_INVERSOR, TECNOLOGIAS_BATERIA,
  type EquipPainel, type EquipInversor, type EquipBateria,
} from '@/lib/simuladores/equipamentos/schemas'
import type { ActionResult } from '@/lib/crm/types'

type Aba = 'paineis' | 'inversores' | 'baterias'
type Campo = { key: string; label: string; tipo: 'number' | 'text' | 'select' | 'bool'; opcoes?: readonly string[]; opcional?: boolean }

const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A] text-sm'
const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

const CAMPOS_PAINEL: Campo[] = [
  { key: 'fabricante', label: 'Fabricante', tipo: 'text' },
  { key: 'modelo', label: 'Modelo', tipo: 'text' },
  { key: 'potenciaWp', label: 'Potência (Wp)', tipo: 'number' },
  { key: 'voc', label: 'Voc (V)', tipo: 'number' },
  { key: 'vmp', label: 'Vmp (V)', tipo: 'number' },
  { key: 'isc', label: 'Isc (A)', tipo: 'number' },
  { key: 'imp', label: 'Imp (A)', tipo: 'number' },
  { key: 'areaM2', label: 'Área (m²)', tipo: 'number' },
  { key: 'coefPmp', label: 'Coef. Pmp (%/°C, fração)', tipo: 'number', opcional: true },
  { key: 'coefVoc', label: 'Coef. Voc (%/°C, fração)', tipo: 'number', opcional: true },
  { key: 'noct', label: 'NOCT (°C)', tipo: 'number', opcional: true },
  { key: 'eficiencia', label: 'Efic. (%)', tipo: 'number', opcional: true },
  { key: 'pesoKg', label: 'Peso (kg)', tipo: 'number', opcional: true },
  { key: 'garantiaAnos', label: 'Garantia (anos)', tipo: 'number', opcional: true },
]
const CAMPOS_INVERSOR: Campo[] = [
  { key: 'fabricante', label: 'Fabricante', tipo: 'text' },
  { key: 'modelo', label: 'Modelo', tipo: 'text' },
  { key: 'tipo', label: 'Tipo', tipo: 'select', opcoes: TIPOS_INVERSOR },
  { key: 'potCaNomW', label: 'Pot. CA nom. (W)', tipo: 'number' },
  { key: 'mpptMinV', label: 'MPPT mín (V)', tipo: 'number' },
  { key: 'mpptMaxV', label: 'MPPT máx (V)', tipo: 'number' },
  { key: 'tensaoCcMaxV', label: 'Tensão CC máx (V)', tipo: 'number' },
  { key: 'numMppt', label: 'Nº MPPT', tipo: 'number' },
  { key: 'corrMaxMpptA', label: 'Corr. máx/MPPT (A)', tipo: 'number' },
  { key: 'potFvMaxWp', label: 'Pot. FV máx (Wp)', tipo: 'number' },
  { key: 'potSurgeW', label: 'Pot. pico/surge (W)', tipo: 'number', opcional: true },
  { key: 'tensaoCcBatV', label: 'Tensão CC bat. (V)', tipo: 'number', opcional: true },
  { key: 'eficiencia', label: 'Efic. (%)', tipo: 'number', opcional: true },
  { key: 'backup', label: 'Backup / ilha', tipo: 'bool', opcional: true },
  { key: 'paralelismo', label: 'Paralelismo (nº)', tipo: 'number', opcional: true },
]
const CAMPOS_BATERIA: Campo[] = [
  { key: 'fabricante', label: 'Fabricante', tipo: 'text' },
  { key: 'modelo', label: 'Modelo', tipo: 'text' },
  { key: 'tecnologia', label: 'Tecnologia', tipo: 'select', opcoes: TECNOLOGIAS_BATERIA },
  { key: 'tensaoV', label: 'Tensão (V)', tipo: 'number' },
  { key: 'capacidadeAh', label: 'Capacidade (Ah)', tipo: 'number' },
  { key: 'energiaKwh', label: 'Energia (kWh)', tipo: 'number', opcional: true },
  { key: 'corrMaxA', label: 'Corr. máx (A)', tipo: 'number', opcional: true },
  { key: 'corrRecomA', label: 'Corr. recom. (A)', tipo: 'number', opcional: true },
  { key: 'dod', label: 'DOD (%)', tipo: 'number', opcional: true },
  { key: 'socMin', label: 'SOC mín (%)', tipo: 'number', opcional: true },
  { key: 'ciclos', label: 'Ciclos', tipo: 'number', opcional: true },
  { key: 'eficiencia', label: 'Efic. round-trip (%)', tipo: 'number', opcional: true },
  { key: 'garantiaAnos', label: 'Garantia (anos)', tipo: 'number', opcional: true },
]

type Item = { id: string } & Record<string, unknown>
type Estado = Record<string, string>

function itemParaEstado(campos: Campo[], it?: Item): Estado {
  const e: Estado = {}
  for (const c of campos) {
    const v = it?.[c.key]
    if (c.tipo === 'bool') e[c.key] = v ? 'sim' : 'nao'
    else if (c.tipo === 'select') e[c.key] = v != null ? String(v) : (c.opcoes?.[0] ?? '')
    else e[c.key] = v != null ? String(v) : ''
  }
  return e
}

function estadoParaPayload(campos: Campo[], e: Estado): Record<string, unknown> {
  const p: Record<string, unknown> = {}
  for (const c of campos) {
    if (c.tipo === 'number') p[c.key] = c.opcional ? num(e[c.key]) : num(e[c.key])
    else if (c.tipo === 'bool') p[c.key] = e[c.key] === 'sim'
    else p[c.key] = e[c.key]
  }
  return p
}

export function EquipamentosManager({
  paineis, inversores, baterias,
}: { paineis: EquipPainel[]; inversores: EquipInversor[]; baterias: EquipBateria[] }) {
  const [aba, setAba] = useState<Aba>('paineis')
  const cfg = {
    paineis:    { campos: CAMPOS_PAINEL,   lista: paineis as unknown as Item[],   create: createPainel,   update: updatePainel,   remove: deletePainel,   label: 'painel' },
    inversores: { campos: CAMPOS_INVERSOR, lista: inversores as unknown as Item[], create: createInversor, update: updateInversor, remove: deleteInversor, label: 'inversor' },
    baterias:   { campos: CAMPOS_BATERIA,  lista: baterias as unknown as Item[],   create: createBateria,  update: updateBateria,  remove: deleteBateria,  label: 'bateria' },
  }[aba]

  const [form, setForm] = useState<Estado>(() => itemParaEstado(CAMPOS_PAINEL))
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  function trocarAba(nova: Aba) {
    setAba(nova)
    setEditId(null)
    setMsg(null)
    const campos = { paineis: CAMPOS_PAINEL, inversores: CAMPOS_INVERSOR, baterias: CAMPOS_BATERIA }[nova]
    setForm(itemParaEstado(campos))
  }

  function editar(it: Item) {
    setEditId(it.id)
    setForm(itemParaEstado(cfg.campos, it))
    setMsg(null)
  }

  function cancelar() {
    setEditId(null)
    setForm(itemParaEstado(cfg.campos))
  }

  function salvar() {
    const payload = estadoParaPayload(cfg.campos, form)
    start(async () => {
      const res: ActionResult = editId
        ? await cfg.update(editId, payload as never)
        : await cfg.create(payload as never)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      window.location.reload()
    })
  }

  function excluir(id: string) {
    if (!window.confirm(`Excluir este ${cfg.label}?`)) return
    start(async () => {
      const res = await cfg.remove(id)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      window.location.reload()
    })
  }

  const abas: { k: Aba; t: string }[] = [
    { k: 'paineis', t: 'Painéis' }, { k: 'inversores', t: 'Inversores' }, { k: 'baterias', t: 'Baterias' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1 text-[var(--theme-text,#1a2340)]">Cadastro de equipamentos</h1>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-4">
        Catálogo de painéis, inversores e baterias da empresa. Alimenta o dimensionamento do simulador Híbrido / Off-grid.
      </p>

      <div className="flex gap-2 mb-4 border-b border-[var(--theme-border,#e7e9f2)]">
        {abas.map((a) => (
          <button key={a.k} onClick={() => trocarAba(a.k)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 ${aba === a.k ? 'border-[#FF9F40] text-[var(--theme-text,#1a2340)]' : 'border-transparent text-[#7b8194]'}`}>
            {a.t}
          </button>
        ))}
      </div>

      {msg && <div className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</div>}

      <div className="rounded-xl border p-4 mb-6">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cfg.campos.map((c) => (
            <label key={c.key} className="text-xs">
              {c.label}{c.opcional ? <span className="text-[#9aa0b0]"> (opcional)</span> : null}
              {c.tipo === 'select' ? (
                <select className={N} value={form[c.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}>
                  {c.opcoes?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : c.tipo === 'bool' ? (
                <select className={N} value={form[c.key] ?? 'nao'} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              ) : (
                <input type={c.tipo === 'number' ? 'number' : 'text'} step="any" className={N}
                  value={form[c.key] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))} />
              )}
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button disabled={pending} onClick={salvar} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">
            {editId ? 'Salvar alterações' : 'Adicionar'}
          </button>
          {editId && <button disabled={pending} onClick={cancelar} className="rounded border text-sm px-3 py-1.5">Cancelar</button>}
        </div>
      </div>

      <div className="space-y-2">
        {cfg.lista.map((it) => (
          <div key={it.id} className="rounded-lg border p-3 flex items-center justify-between text-sm">
            <div><b>{String(it.fabricante)} {String(it.modelo)}</b></div>
            <div>
              <button className="text-[#3b6fd6] mr-3" onClick={() => editar(it)}>editar</button>
              <button className="text-[#c0392b]" onClick={() => excluir(it.id)}>excluir</button>
            </div>
          </div>
        ))}
        {cfg.lista.length === 0 && <p className="text-sm text-[#6b7280]">Nenhum {cfg.label} cadastrado ainda. Adicione o primeiro acima.</p>}
      </div>
    </div>
  )
}
