'use client'
import { useState } from 'react'
import { bibliotecaParaCarga, type CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import type { Carga } from '@/lib/simuladores/hibrido/types'

const IN = 'w-full rounded border px-1.5 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'

const CARGA_VAZIA: Carga = {
  nome: '', quantidade: 1, potenciaUnitW: 0, potenciaPartidaW: 0, tensaoV: 220,
  fatorPotencia: 0.9, horasDia: 1, diasSemana: 7, horaInicio: 18, horaFim: 22,
  critica: false,
}

const consumoDiarioWh = (c: Carga) =>
  c.quantidade * c.potenciaUnitW * c.horasDia * (c.diasSemana / 7)

type Props = {
  cargas: Carga[]
  biblioteca: CargaBiblioteca[]
  onChange: (cargas: Carga[]) => void
}

export function CargasTabela({ cargas, biblioteca, onChange }: Props) {
  const [selecionado, setSelecionado] = useState<string>(biblioteca[0]?.id ?? '')

  // A seleção guardada pode ficar obsoleta: a biblioteca é do componente pai e
  // muda quando o usuário cadastra ou exclui modelos no painel. Sem esta
  // reconciliação, um id que saiu da lista deixaria "Adicionar" sem efeito
  // nenhum — falha silenciosa. Cai sempre no primeiro item disponível.
  const selecaoValida = biblioteca.some((b) => b.id === selecionado)
  const selecionadoEfetivo = selecaoValida ? selecionado : (biblioteca[0]?.id ?? '')

  function addDaBiblioteca() {
    const m = biblioteca.find((b) => b.id === selecionadoEfetivo)
    if (!m) return
    onChange([...cargas, bibliotecaParaCarga(m)])
  }

  function addEmBranco() {
    onChange([...cargas, { ...CARGA_VAZIA }])
  }

  function alterar(i: number, patch: Partial<Carga>) {
    onChange(cargas.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  function remover(i: number) {
    onChange(cargas.filter((_, idx) => idx !== i))
  }

  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-xs">
          Adicionar da biblioteca
          <select
            className={`${IN} mt-1 min-w-56`}
            data-testid="select-biblioteca"
            value={selecionadoEfetivo}
            onChange={(e) => setSelecionado(e.target.value)}
          >
            {biblioteca.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          data-testid="btn-add-biblioteca"
          onClick={addDaBiblioteca}
          className="rounded bg-[#FF9F40] px-3 py-1.5 text-sm font-semibold text-[#1a1a1a]"
        >
          Adicionar
        </button>
        <button
          type="button"
          data-testid="btn-add-branco"
          onClick={addEmBranco}
          className="rounded border px-3 py-1.5 text-sm"
        >
          Adicionar em branco
        </button>
      </div>

      {cargas.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--theme-text-muted,#9aa0b0)]">
          Nenhuma carga adicionada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--theme-text-muted,#7b8194)]">
                <th className="p-1">Carga</th>
                <th className="p-1">Qtd</th>
                <th className="p-1">Pot. (W)</th>
                <th className="p-1">Partida (W)</th>
                <th className="p-1">h/dia</th>
                <th className="p-1">dias/sem</th>
                <th className="p-1">Início</th>
                <th className="p-1">Fim</th>
                <th className="p-1">Crítica</th>
                <th className="p-1">Wh/dia</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody>
              {cargas.map((c, i) => (
                <tr key={i} className="border-t border-[var(--theme-border,#e7e9f2)]">
                  <td className="p-1">
                    <input className={IN} data-testid={`nome-${i}`} value={c.nome}
                      onChange={(e) => alterar(i, { nome: e.target.value })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} className={IN} data-testid={`qtd-${i}`} value={c.quantidade}
                      onChange={(e) => alterar(i, { quantidade: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-20">
                    <input type="number" min={0} className={IN} data-testid={`pot-${i}`} value={c.potenciaUnitW}
                      onChange={(e) => alterar(i, { potenciaUnitW: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-20">
                    <input type="number" min={0} className={IN} data-testid={`partida-${i}`} value={c.potenciaPartidaW}
                      onChange={(e) => alterar(i, { potenciaPartidaW: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} max={24} step="any" className={IN} data-testid={`horas-${i}`} value={c.horasDia}
                      onChange={(e) => alterar(i, { horasDia: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={1} max={7} className={IN} data-testid={`dias-${i}`} value={c.diasSemana}
                      onChange={(e) => alterar(i, { diasSemana: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} max={24} step="any" className={IN} data-testid={`inicio-${i}`} value={c.horaInicio}
                      onChange={(e) => alterar(i, { horaInicio: num(e.target.value) })} />
                  </td>
                  <td className="p-1 w-16">
                    <input type="number" min={0} max={24} step="any" className={IN} data-testid={`fim-${i}`} value={c.horaFim}
                      onChange={(e) => alterar(i, { horaFim: num(e.target.value) })} />
                  </td>
                  <td className="p-1 text-center">
                    <input type="checkbox" data-testid={`critica-${i}`} checked={c.critica}
                      onChange={(e) => alterar(i, { critica: e.target.checked })} />
                  </td>
                  <td className="p-1 tabular-nums" data-testid={`consumo-linha-${i}`}>
                    {consumoDiarioWh(c).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="p-1">
                    <button type="button" data-testid={`btn-remover-${i}`} onClick={() => remover(i)}
                      className="text-[#c0392b]">remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
