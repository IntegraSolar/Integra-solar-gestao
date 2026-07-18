'use client'
import { useState, useTransition } from 'react'
import {
  createCartaoTabela, updateCartaoTabela, deleteCartaoTabela,
  type CartaoTabela,
} from '@/lib/simuladores/cartao/tabelas-actions'

type Form = { nome: string; maxParcelas: number; observacao: string; taxasPct: Record<string, string> }
const VAZIO: Form = { nome: '', maxParcelas: 12, observacao: '', taxasPct: {} }
const N = 'mt-1 w-full rounded border px-2 py-1 bg-[#FFF7DC] border-[#E7CE7A]'

const fracToPct = (f: number) => (f * 100).toString()
const pctToFrac = (p: string) => (p === '' ? 0 : Number(p) / 100)

export function CartaoTabelasManager({ inicial }: { inicial: CartaoTabela[] }) {
  const [lista, setLista] = useState<CartaoTabela[]>(inicial)
  const [form, setForm] = useState<Form>(VAZIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  function editar(t: CartaoTabela) {
    setEditId(t.id)
    const taxasPct: Record<string, string> = {}
    for (const [k, v] of Object.entries(t.taxas)) taxasPct[k] = fracToPct(v)
    setForm({ nome: t.nome, maxParcelas: t.maxParcelas, observacao: t.observacao ?? '', taxasPct })
    setMsg(null)
  }

  function salvar() {
    const taxas: Record<string, number> = {}
    for (let n = 1; n <= form.maxParcelas; n++) taxas[String(n)] = pctToFrac(form.taxasPct[String(n)] ?? '')
    const payload = { nome: form.nome, maxParcelas: form.maxParcelas, observacao: form.observacao || null, taxas, ordem: 0 }
    start(async () => {
      const res = editId ? await updateCartaoTabela(editId, payload) : await createCartaoTabela(payload)
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      window.location.reload()
    })
  }

  function excluir(id: string) {
    if (!window.confirm('Excluir esta tabela?')) return
    start(async () => {
      const res = await deleteCartaoTabela(id)
      if ('error' in res) { setMsg({ text: res.error ?? 'Erro.', erro: true }); return }
      setLista((l) => l.filter((t) => t.id !== id))
    })
  }

  const cheio = lista.length >= 3 && !editId

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-1 text-[var(--theme-text,#1a2340)]">Tabelas de cartão</h1>
      <p className="text-sm text-[var(--theme-text-muted,#6b7280)] mb-4">Configure até 3 tabelas de taxa (ex.: Visa/Amex, Master/Elo). As taxas são digitadas em %.</p>
      {msg && <div className={`mb-3 text-sm ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</div>}

      {cheio ? (
        <div className="mb-4 text-sm text-[#6b7280]">Limite de 3 tabelas atingido. Exclua uma para criar outra.</div>
      ) : (
        <div className="rounded-xl border p-4 mb-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">Nome<input className={N} value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></label>
            <label className="text-xs">Máx. de parcelas
              <input type="number" min={1} max={24} step={1} className={N} value={String(form.maxParcelas)}
                onChange={(e) => setForm((f) => ({ ...f, maxParcelas: Math.max(1, Math.min(24, Number(e.target.value) || 1)) }))} />
            </label>
            <label className="text-xs">Observação<input className={N} value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} /></label>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: form.maxParcelas }, (_, i) => i + 1).map((n) => (
              <label key={n} className="text-xs">{n}x — taxa %
                <input type="number" step="any" className={N} value={form.taxasPct[String(n)] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, taxasPct: { ...f.taxasPct, [String(n)]: e.target.value } }))} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={pending} onClick={salvar} className="rounded bg-[#FF9F40] text-[#1a1a1a] text-sm font-semibold px-3 py-1.5 disabled:opacity-60">
              {editId ? 'Salvar alterações' : 'Adicionar'}
            </button>
            {editId && <button disabled={pending} onClick={() => { setEditId(null); setForm(VAZIO) }} className="rounded border text-sm px-3 py-1.5">Cancelar</button>}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {lista.map((t) => (
          <div key={t.id} className="rounded-lg border p-3 flex items-center justify-between text-sm">
            <div>
              <b>{t.nome}</b> — até {t.maxParcelas}x {t.observacao ? <span className="text-[#6b7280]">· {t.observacao}</span> : null}
            </div>
            <div>
              <button className="text-[#3b6fd6] mr-3" onClick={() => editar(t)}>editar</button>
              <button className="text-[#c0392b]" onClick={() => excluir(t.id)}>excluir</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-[#6b7280]">Nenhuma tabela ainda. Crie a primeira acima.</p>}
      </div>
    </div>
  )
}
