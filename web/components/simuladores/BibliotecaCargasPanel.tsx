'use client'
import { useState, useTransition } from 'react'
import {
  createCargaBiblioteca, updateCargaBiblioteca, deleteCargaBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'
import {
  CATEGORIAS_CARGA, PRIORIDADES_CARGA,
  type CargaBiblioteca, type CargaBibliotecaData,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'

const VAZIO: CargaBibliotecaData = {
  nome: '', categoria: 'Outro', potenciaUnitW: 0, potenciaPartidaW: 0, tensaoV: 220,
  fatorPotencia: 0.9, horasDia: 1, diasSemana: 7, horaInicio: 18, horaFim: 22,
  prioridade: 'Média', critica: false,
}

export function BibliotecaCargasPanel({ inicial }: { inicial: CargaBiblioteca[] }) {
  const [aberto, setAberto] = useState(false)
  const [lista, setLista] = useState(inicial)
  const [form, setForm] = useState<CargaBibliotecaData>(VAZIO)
  const [editId, setEditId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; erro: boolean } | null>(null)
  const [pending, start] = useTransition()

  const num = (v: string) => (v === '' ? 0 : Number(v))
  const set = (patch: Partial<CargaBibliotecaData>) => setForm((f) => ({ ...f, ...patch }))

  function editar(m: CargaBiblioteca) {
    const { id, ...dados } = m
    void id
    setEditId(m.id)
    setForm(dados)
    setMsg(null)
  }

  function salvar() {
    start(async () => {
      const res = editId ? await updateCargaBiblioteca(editId, form) : await createCargaBiblioteca(form)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      setMsg({ text: res.success ?? 'Salvo.', erro: false })
      setForm(VAZIO)
      setEditId(null)
    })
  }

  function excluir(id: string) {
    start(async () => {
      const res = await deleteCargaBiblioteca(id)
      if (res.error) { setMsg({ text: res.error, erro: true }); return }
      setLista((l) => l.filter((m) => m.id !== id))
    })
  }

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <button
        type="button"
        data-testid="btn-toggle-biblioteca"
        onClick={() => setAberto((a) => !a)}
        className="text-sm font-semibold text-[var(--theme-text,#1a2340)]"
      >
        {aberto ? '▾' : '▸'} Biblioteca de cargas da empresa ({lista.length})
      </button>

      {aberto && (
        <div className="mt-3">
          {msg && (
            <p className={`mb-2 text-xs ${msg.erro ? 'text-[#c0392b]' : 'text-[#1f9d55]'}`}>{msg.text}</p>
          )}

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <label className="text-[11px]">Nome
              <input className={IN} data-testid="bib-nome" value={form.nome}
                onChange={(e) => set({ nome: e.target.value })} />
            </label>
            <label className="text-[11px]">Categoria
              <select className={IN} data-testid="bib-categoria" value={form.categoria ?? 'Outro'}
                onChange={(e) => set({ categoria: e.target.value as CargaBibliotecaData['categoria'] })}>
                {CATEGORIAS_CARGA.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[11px]">Potência (W)
              <input type="number" className={IN} data-testid="bib-pot" value={form.potenciaUnitW}
                onChange={(e) => set({ potenciaUnitW: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Partida (W)
              <input type="number" className={IN} data-testid="bib-partida" value={form.potenciaPartidaW}
                onChange={(e) => set({ potenciaPartidaW: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Tensão (V)
              <input type="number" className={IN} data-testid="bib-tensao" value={form.tensaoV}
                onChange={(e) => set({ tensaoV: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">FP
              <input type="number" step="any" className={IN} data-testid="bib-fp" value={form.fatorPotencia}
                onChange={(e) => set({ fatorPotencia: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">h/dia
              <input type="number" step="any" className={IN} data-testid="bib-horas" value={form.horasDia}
                onChange={(e) => set({ horasDia: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">dias/sem
              <input type="number" className={IN} data-testid="bib-dias" value={form.diasSemana}
                onChange={(e) => set({ diasSemana: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Início
              <input type="number" step="any" className={IN} data-testid="bib-inicio" value={form.horaInicio}
                onChange={(e) => set({ horaInicio: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Fim
              <input type="number" step="any" className={IN} data-testid="bib-fim" value={form.horaFim}
                onChange={(e) => set({ horaFim: num(e.target.value) })} />
            </label>
            <label className="text-[11px]">Prioridade
              <select className={IN} data-testid="bib-prioridade" value={form.prioridade ?? 'Média'}
                onChange={(e) => set({ prioridade: e.target.value as CargaBibliotecaData['prioridade'] })}>
                {PRIORIDADES_CARGA.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-[11px]">Crítica
              <input type="checkbox" className="mt-2 block" data-testid="bib-critica" checked={form.critica}
                onChange={(e) => set({ critica: e.target.checked })} />
            </label>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="button" disabled={pending} data-testid="btn-salvar-biblioteca" onClick={salvar}
              className="rounded bg-[#FF9F40] px-3 py-1.5 text-sm font-semibold text-[#1a1a1a] disabled:opacity-60">
              {editId ? 'Salvar alterações' : 'Adicionar à biblioteca'}
            </button>
            {editId && (
              <button type="button" disabled={pending} onClick={() => { setEditId(null); setForm(VAZIO) }}
                className="rounded border px-3 py-1.5 text-sm">Cancelar</button>
            )}
          </div>

          <ul className="mt-4 space-y-1">
            {lista.map((m) => (
              <li key={m.id} className="flex items-center justify-between border-t border-[var(--theme-border,#e7e9f2)] py-1 text-xs">
                <span>
                  <b>{m.nome}</b>
                  <span className="text-[var(--theme-text-muted,#7b8194)]">
                    {' '}— {m.potenciaUnitW} W (partida {m.potenciaPartidaW} W)
                  </span>
                </span>
                <span>
                  <button type="button" className="mr-3 text-[#3b6fd6]" data-testid={`btn-editar-${m.id}`}
                    onClick={() => editar(m)}>editar</button>
                  <button type="button" className="text-[#c0392b]" data-testid={`btn-excluir-${m.id}`}
                    onClick={() => excluir(m.id)}>excluir</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
