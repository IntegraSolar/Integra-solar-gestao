'use client'
import { useState } from 'react'
import type { CamposHibrido } from '@/lib/simuladores/hibrido/montar-input'

const IN = 'mt-1 w-full rounded border px-2 py-1 text-xs bg-[#FFF7DC] border-[#E7CE7A]'
const CARD = 'rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4'

type CampoTexto = {
  key: 'numModulos' | 'modulosPorString' | 'numStrings' | 'tensaoBancoV' | 'diasAutonomia'
    | 'simultaneidade' | 'margemInversor' | 'dcAcMax' | 'dcAcMin'
  label: string
  placeholder: string
}

const ARRANJO: CampoTexto[] = [
  { key: 'numModulos', label: 'Nº de módulos', placeholder: 'recomendado' },
  { key: 'modulosPorString', label: 'Módulos por string', placeholder: 'máximo' },
  { key: 'numStrings', label: 'Nº de strings', placeholder: 'automático' },
  { key: 'tensaoBancoV', label: 'Tensão do banco (V)', placeholder: 'do inversor' },
  { key: 'diasAutonomia', label: 'Dias de autonomia', placeholder: '2' },
]

const PREMISSAS: CampoTexto[] = [
  { key: 'simultaneidade', label: 'Fator de simultaneidade', placeholder: '0,7' },
  { key: 'margemInversor', label: 'Margem do inversor', placeholder: '0,25' },
  { key: 'dcAcMax', label: 'DC/AC máximo', placeholder: '1,35' },
  { key: 'dcAcMin', label: 'DC/AC mínimo', placeholder: '1' },
]

type Props = { campos: CamposHibrido; onChange: (c: CamposHibrido) => void }

export function HibridoAvancado({ campos, onChange }: Props) {
  const [aberto, setAberto] = useState(false)
  const set = (patch: Partial<CamposHibrido>) => onChange({ ...campos, ...patch })

  return (
    <div className={CARD}>
      <button type="button" data-testid="btn-toggle-avancado" onClick={() => setAberto((a) => !a)}
        className="text-sm font-semibold text-[var(--theme-text,#1a2340)]">
        {aberto ? '▾' : '▸'} Ajustes avançados
      </button>

      {aberto && (
        <div className="mt-3">
          <p className="mb-3 text-[11px] text-[var(--theme-text-muted,#7b8194)]">
            Campos em branco usam o valor calculado ou padrão. Preencha só o que quiser forçar.
          </p>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {ARRANJO.map((c) => (
              <label key={c.key} className="text-[11px]">{c.label}
                <input className={IN} data-testid={`av-${c.key}`} placeholder={c.placeholder}
                  value={campos[c.key]} onChange={(e) => set({ [c.key]: e.target.value } as Partial<CamposHibrido>)} />
              </label>
            ))}
            <label className="text-[11px]">Base da energia
              <select className={IN} data-testid="av-baseEnergia" value={campos.baseEnergia}
                onChange={(e) => set({ baseEnergia: e.target.value as CamposHibrido['baseEnergia'] })}>
                <option value="total">Consumo total</option>
                <option value="criticas">Só cargas críticas</option>
              </select>
            </label>
            <label className="text-[11px]">Tipo de sistema
              <select className={IN} data-testid="av-tipoSistema" value={campos.tipoSistema}
                onChange={(e) => set({ tipoSistema: e.target.value as CamposHibrido['tipoSistema'] })}>
                <option value="Híbrido">Híbrido</option>
                <option value="Off-grid">Off-grid</option>
                <option value="On-grid">On-grid</option>
              </select>
            </label>
          </div>

          <h3 className="mt-4 text-xs font-semibold text-[var(--theme-text,#1a2340)]">Premissas</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PREMISSAS.map((c) => (
              <label key={c.key} className="text-[11px]">{c.label}
                <input className={IN} data-testid={`av-${c.key}`} placeholder={c.placeholder}
                  value={campos[c.key]} onChange={(e) => set({ [c.key]: e.target.value } as Partial<CamposHibrido>)} />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
