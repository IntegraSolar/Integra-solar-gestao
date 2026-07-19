'use client'
import { useMemo, useState } from 'react'
import { calcularCargas } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import type { Carga } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { CargasTabela } from './CargasTabela'
import { CargasResumo } from './CargasResumo'
import { CargasCurva24h } from './CargasCurva24h'
import { BibliotecaCargasPanel } from './BibliotecaCargasPanel'

export function CargasBuilder({ biblioteca: bibliotecaInicial }: { biblioteca: CargaBiblioteca[] }) {
  const [cargas, setCargas] = useState<Carga[]>([])
  const [biblioteca, setBiblioteca] = useState<CargaBiblioteca[]>(bibliotecaInicial)

  // Os cálculos vêm do motor da Fase 2a — nenhuma fórmula vive na UI.
  const resumo = useMemo(() => calcularCargas(cargas, PREMISSAS_PADRAO), [cargas])

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-bold text-[var(--theme-text,#1a2340)]">Levantamento de cargas</h1>
      <p className="mb-3 text-sm text-[var(--theme-text-muted,#6b7280)]">
        Monte a lista de cargas da instalação. O consumo e a curva de demanda são calculados automaticamente.
      </p>

      <div className="mb-5 rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]">
        Este levantamento ainda não é salvo: ao recarregar a página, a lista é perdida.
        A persistência chega junto com o simulador completo.
      </div>

      <div className="space-y-4">
        <CargasTabela cargas={cargas} biblioteca={biblioteca} onChange={setCargas} />
        <CargasResumo resumo={resumo} />
        <CargasCurva24h curva={resumo.curva24h} />
        <BibliotecaCargasPanel biblioteca={biblioteca} onBibliotecaChange={setBiblioteca} />
      </div>
    </div>
  )
}
