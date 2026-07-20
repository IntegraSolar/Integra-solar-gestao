'use client'
import { useState } from 'react'
import { parseHspColado, type CamposHibrido } from '@/lib/simuladores/hibrido/montar-input'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type Props = { campos: CamposHibrido; onChange: (c: CamposHibrido) => void }

export function HibridoInputsProjeto({ campos, onChange }: Props) {
  const [colado, setColado] = useState('')
  const [erroColagem, setErroColagem] = useState(false)

  const set = (patch: Partial<CamposHibrido>) => onChange({ ...campos, ...patch })
  const num = (v: string) => (v === '' ? 0 : Number(v))

  function aplicarColagem() {
    const valores = parseHspColado(colado)
    if (!valores) { setErroColagem(true); return }
    setErroColagem(false)
    setColado('')
    set({ hspMensal: valores })
  }

  function setHsp(i: number, v: string) {
    const novo = [...campos.hspMensal]
    novo[i] = num(v)
    set({ hspMensal: novo })
  }

  return (
    <div className={CARD}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Projeto e clima</h2>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <label className="text-[11px]">Temp. média (°C)
          <input type="number" step="any" className={IN} data-testid="temp-media"
            value={campos.tempMediaC} onChange={(e) => set({ tempMediaC: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Temp. máxima (°C)
          <input type="number" step="any" className={IN} data-testid="temp-max"
            value={campos.tempMaxC} onChange={(e) => set({ tempMaxC: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Temp. mínima (°C)
          <input type="number" step="any" className={IN} data-testid="temp-min"
            value={campos.tempMinC} onChange={(e) => set({ tempMinC: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Perda por sombreamento
          <input type="number" step="any" className={IN} data-testid="perda-sombra"
            value={campos.perdaSombreamento} onChange={(e) => set({ perdaSombreamento: num(e.target.value) })} />
        </label>
        <label className="text-[11px]">Perda por orientação
          <input type="number" step="any" className={IN} data-testid="perda-orientacao"
            value={campos.perdaOrientacao} onChange={(e) => set({ perdaOrientacao: num(e.target.value) })} />
        </label>
      </div>

      <div className="mt-3 max-w-xs">
        <label className="text-[11px]">Critério de geração
          <select className={IN} data-testid="criterio-geracao" value={campos.criterioGeracao}
            onChange={(e) => set({ criterioGeracao: e.target.value as CamposHibrido['criterioGeracao'] })}>
            <option value="mes_critico">Mês crítico (conservador)</option>
            <option value="media_anual">Média anual</option>
          </select>
        </label>
      </div>

      <h3 className="mt-5 text-xs font-semibold text-[var(--theme-text,#1a2340)]">
        Irradiação mensal — HSP (kWh/m²·dia)
      </h3>
      <p className="mb-2 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
        Consulte no CRESESB ou PVGIS e cole a linha dos 12 meses abaixo, ou preencha campo a campo.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-[11px] flex-1 min-w-64">Colar os 12 valores
          <input className={IN} data-testid="hsp-colar" value={colado}
            placeholder="4,75 4,71 4,70 …"
            onChange={(e) => { setColado(e.target.value); setErroColagem(false) }} />
        </label>
        <button type="button" data-testid="btn-aplicar-hsp" onClick={aplicarColagem}
          className="rounded border px-3 py-1.5 text-sm">Aplicar</button>
      </div>
      {erroColagem && (
        <p className="mb-3 text-[11px] text-[#c0392b]" data-testid="erro-hsp">
          Não encontrei exatamente 12 números. Confira a colagem — os valores atuais não foram alterados.
        </p>
      )}

      <div className="grid gap-2 grid-cols-3 sm:grid-cols-6 lg:grid-cols-12">
        {MESES.map((m, i) => (
          <label key={m} className="text-[11px]">{m}
            <input type="number" step="any" className={IN} data-testid={`hsp-${i}`}
              value={campos.hspMensal[i] ?? 0} onChange={(e) => setHsp(i, e.target.value)} />
          </label>
        ))}
      </div>
    </div>
  )
}
