'use client'
import { useMemo, useState, useTransition } from 'react'
import {
  createConcessionaria, updateConcessionaria, deleteConcessionaria,
  type ConcessionariaRow,
} from '@/lib/simuladores/viabilidade/concessionarias-actions'
import {
  derivarConcessionaria, type ConcessionariaBruta,
} from '@/lib/simuladores/viabilidade/concessionaria'

const VAZIA: ConcessionariaBruta = {
  nome: '', tipoProcesso: 'Reajuste 2025',
  tusd: 0, te: 0, tusdFioB: 0, tusdFioA: 0, tusdPeD: 0, tusdTfsee: 0,
  icms: 0, pisCofins: 0, demandaContratadaSemImp: 0, demandaGeracaoSemImp: 0,
  aplicaReajuste1430: true,
}

// Campos brutos numéricos (amarelo) e seus rótulos.
const CAMPOS_NUM: { key: keyof ConcessionariaBruta; label: string }[] = [
  { key: 'tusd', label: 'TUSD (R$/MWh)' },
  { key: 'te', label: 'TE (R$/MWh)' },
  { key: 'tusdFioB', label: 'TUSD Fio B (R$/MWh)' },
  { key: 'tusdFioA', label: 'TUSD Fio A (R$/MWh)' },
  { key: 'tusdPeD', label: 'TUSD P&D (R$/MWh)' },
  { key: 'tusdTfsee', label: 'TUSD TFSEE (R$/MWh)' },
  { key: 'icms', label: 'ICMS (fração)' },
  { key: 'pisCofins', label: 'Pis/Cofins (fração)' },
  { key: 'demandaContratadaSemImp', label: 'Demanda Contratada s/ imp. (R$/kW)' },
  { key: 'demandaGeracaoSemImp', label: 'Demanda Geração s/ imp. (R$/kW)' },
]

const AMARELO = 'bg-[#FFF7DC] border-[#E7CE7A]'
const CINZA = 'bg-[#F1F3F7] text-[#555] border-[#E0E3EE]'

export function ConcessionariasManager({ inicial }: { inicial: ConcessionariaRow[] }) {
  const [lista, setLista] = useState<ConcessionariaRow[]>(inicial)
  const [form, setForm] = useState<ConcessionariaBruta>(VAZIA)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  const derivada = useMemo(() => derivarConcessionaria(form), [form])
  const fmt = (n: number, d = 4) => (Number.isFinite(n) ? n.toFixed(d) : '—')

  function setNum(key: keyof ConcessionariaBruta, v: string) {
    setForm((f) => ({ ...f, [key]: v === '' ? 0 : Number(v) }))
  }

  function editar(row: ConcessionariaRow) {
    setEditId(row.id)
    const { id: _id, ...bruta } = row
    void _id
    setForm(bruta)
    setMsg(null)
  }

  function salvar() {
    start(async () => {
      const res = editId
        ? await updateConcessionaria(editId, form)
        : await createConcessionaria(form)
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      setMsg({ text: res.success ?? '', erro: false })
      // Recarrega a lista via reload leve (a page revalida a rota).
      window.location.reload()
    })
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir esta concessionária?')) return
    start(async () => {
      const res = await deleteConcessionaria(id)
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      setLista((l) => l.filter((c) => c.id !== id))
    })
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1 text-[var(--theme-text,#1a2340)]">Concessionárias — Viabilidade</h1>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-4">
        Campos <span className="px-1 rounded bg-[#FFF7DC] border border-[#E7CE7A]">amarelos</span> são editáveis;
        os <span className="px-1 rounded bg-[#F1F3F7] border border-[#E0E3EE]">cinza</span> são calculados automaticamente.
      </p>
      {msg && <div className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</div>}

      {/* Formulário */}
      <div className="rounded-xl border p-4 mb-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs">Nome
            <input className={`mt-1 w-full rounded border px-2 py-1 ${AMARELO}`}
              value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          </label>
          <label className="text-xs">Tipo de processo
            <input className={`mt-1 w-full rounded border px-2 py-1 ${AMARELO}`}
              value={form.tipoProcesso} onChange={(e) => setForm((f) => ({ ...f, tipoProcesso: e.target.value }))} />
          </label>
          <label className="text-xs flex items-center gap-2 mt-5">
            <input type="checkbox" checked={form.aplicaReajuste1430}
              onChange={(e) => setForm((f) => ({ ...f, aplicaReajuste1430: e.target.checked }))} />
            Reajuste após Lei 14.300
          </label>
          {CAMPOS_NUM.map(({ key, label }) => (
            <label key={key} className="text-xs">{label}
              <input type="number" step="any" className={`mt-1 w-full rounded border px-2 py-1 ${AMARELO}`}
                value={String(form[key] as number)} onChange={(e) => setNum(key, e.target.value)} />
            </label>
          ))}
        </div>

        {/* Derivados (cinza, read-only) */}
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 mt-4 text-xs">
          {([
            ['Tarifa Total s/ imp.', derivada.tarifaTotalSemImp, 2],
            ['Fio B / Tarifa', derivada.fracFioB, 5],
            ['Fio A / Tarifa', derivada.fracFioA, 5],
            ['P&D / Tarifa', derivada.fracPeD, 5],
            ['TFSEE / Tarifa', derivada.fracTfsee, 5],
            ['Total GD3 / Tarifa', derivada.fracGD3Total, 5],
            ['Tarifa Total c/ imp.', derivada.tarifaTotalComImp, 2],
            ['Compensável compartilhada', derivada.tarifaCompensavelCompartilhada, 2],
            ['Demanda Geração c/ imp.', derivada.demandaGeracaoComImp, 4],
            ['Redução Dc/Dg', derivada.reducaoDcDg, 5],
          ] as [string, number, number][]).map(([label, val, dec]) => (
            <div key={label} className={`rounded border px-2 py-1 ${CINZA}`}>
              <div className="text-[10px] opacity-70">{label}</div>
              <div className="font-mono">{fmt(val, dec)}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button disabled={pending} onClick={salvar}
            className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">
            {editId ? 'Salvar alterações' : 'Adicionar'}
          </button>
          {editId && (
            <button disabled={pending} onClick={() => { setEditId(null); setForm(VAZIA) }}
              className="rounded border text-sm px-3 py-1.5">Cancelar</button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-2">Concessionária</th>
              <th className="py-1 pr-2">Fio B / Tarifa</th>
              <th className="py-1 pr-2">Tarifa loc. (R$/kWh)</th>
              <th className="py-1 pr-2">Demanda Ger. c/ imp.</th>
              <th className="py-1 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => {
              const d = derivarConcessionaria(c)
              return (
                <tr key={c.id} className="border-b">
                  <td className="py-1 pr-2 font-medium">{c.nome}</td>
                  <td className="py-1 pr-2 font-mono">{d.fracFioB.toFixed(5)}</td>
                  <td className="py-1 pr-2 font-mono">{(d.tarifaCompensavelCompartilhada / 1000).toFixed(4)}</td>
                  <td className="py-1 pr-2 font-mono">{d.demandaGeracaoComImp.toFixed(4)}</td>
                  <td className="py-1 pr-2">
                    <button className="text-[#3b6fd6] mr-3" onClick={() => editar(c)}>editar</button>
                    <button className="text-[#c0392b]" onClick={() => excluir(c.id)}>excluir</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
