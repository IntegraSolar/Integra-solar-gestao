'use client'
import Link from 'next/link'
import type { CamposHibrido, EquipamentosDisponiveis } from '@/lib/simuladores/hibrido/montar-input'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type Props = {
  campos: CamposHibrido
  equipamentos: EquipamentosDisponiveis
  onChange: (c: CamposHibrido) => void
}

export function HibridoSelecaoEquipamentos({ campos, equipamentos, onChange }: Props) {
  const set = (patch: Partial<CamposHibrido>) => onChange({ ...campos, ...patch })
  const nada =
    equipamentos.paineis.length === 0 &&
    equipamentos.inversores.length === 0 &&
    equipamentos.baterias.length === 0

  return (
    <div className={CARD}>
      <h2 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Equipamentos</h2>

      {nada && (
        <div
          className="mb-3 rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]"
          data-testid="aviso-sem-equipamentos"
        >
          Nenhum equipamento cadastrado ainda. Cadastre painéis, inversores e baterias em{' '}
          <Link href="/simuladores/hibrido-offgrid/equipamentos" className="underline">
            Cadastro de equipamentos
          </Link>{' '}
          para o dimensionamento funcionar.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[11px]">Painel
          <select className={IN} data-testid="sel-painel" value={campos.painelId}
            onChange={(e) => set({ painelId: e.target.value })}>
            <option value="">— selecione —</option>
            {equipamentos.paineis.map((p) => (
              <option key={p.id} value={p.id}>{p.fabricante} {p.modelo} · {p.potenciaWp} Wp</option>
            ))}
          </select>
        </label>
        <label className="text-[11px]">Inversor
          <select className={IN} data-testid="sel-inversor" value={campos.inversorId}
            onChange={(e) => set({ inversorId: e.target.value })}>
            <option value="">— selecione —</option>
            {equipamentos.inversores.map((i) => (
              <option key={i.id} value={i.id}>{i.fabricante} {i.modelo} · {i.potCaNomW} W</option>
            ))}
          </select>
        </label>
        <label className="text-[11px]">Bateria
          <select className={IN} data-testid="sel-bateria" value={campos.bateriaId}
            onChange={(e) => set({ bateriaId: e.target.value })}>
            <option value="">— selecione —</option>
            {equipamentos.baterias.map((b) => (
              <option key={b.id} value={b.id}>{b.fabricante} {b.modelo} · {b.tensaoV} V/{b.capacidadeAh} Ah</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
