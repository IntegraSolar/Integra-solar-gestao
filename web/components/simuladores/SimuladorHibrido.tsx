'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { calcularHibrido } from '@/lib/simuladores/hibrido'
import {
  CAMPOS_INICIAIS, montarHibridoInput, montarPremissas,
  type CamposHibrido, type EquipamentosDisponiveis,
} from '@/lib/simuladores/hibrido/montar-input'
import type { Carga } from '@/lib/simuladores/hibrido/types'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'
import { HibridoInputsProjeto } from './HibridoInputsProjeto'
import { HibridoSelecaoEquipamentos } from './HibridoSelecaoEquipamentos'
import { HibridoAvancado } from './HibridoAvancado'
import { HibridoResultadosFV } from './HibridoResultadosFV'
import { HibridoResultadosArmazenamento } from './HibridoResultadosArmazenamento'
import { HibridoProducaoMensal } from './HibridoProducaoMensal'
import { HibridoAlertas } from './HibridoAlertas'
import { CargasBuilder } from './CargasBuilder'
import {
  camposFinanceiroIniciais, fisicoParaFinanceiro, montarFinanceiroInput,
  type CamposFinanceiro,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import { calcularFinanceiro } from '@/lib/simuladores/hibrido/financeiro'
import { calcularEconomiaAno } from '@/lib/simuladores/hibrido/economia'
import { PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { HibridoInputsFinanceiro } from './HibridoInputsFinanceiro'
import { HibridoResultadosCapex } from './HibridoResultadosCapex'
import { HibridoResultadosEconomia } from './HibridoResultadosEconomia'
import { HibridoIndicadores } from './HibridoIndicadores'
import { HibridoProjecao } from './HibridoProjecao'

type Props = {
  equipamentos: EquipamentosDisponiveis
  biblioteca: CargaBiblioteca[]
}

export function SimuladorHibrido({ equipamentos, biblioteca: bibliotecaInicial }: Props) {
  const [campos, setCampos] = useState<CamposHibrido>(CAMPOS_INICIAIS)
  const [cargas, setCargas] = useState<Carga[]>([])
  const [biblioteca, setBiblioteca] = useState<CargaBiblioteca[]>(bibliotecaInicial)
  const [camposFin, setCamposFin] = useState<CamposFinanceiro>(() =>
    camposFinanceiroIniciais(new Date().getFullYear())
  )

  // Uma única fonte: o input montado gera o resultado. Nenhum cálculo na UI.
  const premissas = useMemo(() => montarPremissas(campos), [campos])
  const input = useMemo(
    () => montarHibridoInput(campos, equipamentos, cargas),
    [campos, equipamentos, cargas]
  )
  const resultado = useMemo(() => calcularHibrido(input, premissas), [input, premissas])

  // Financeiro: deriva do resultado físico, sem recalcular nada na UI.
  const paramsFin = useMemo(
    () => montarFinanceiroInput(camposFin, fisicoParaFinanceiro(resultado)),
    [camposFin, resultado]
  )
  const financeiro = useMemo(() => calcularFinanceiro(paramsFin), [paramsFin])
  const economiaAno1 = useMemo(
    () => calcularEconomiaAno(1, {
      fisico: paramsFin.fisico,
      tarifas: paramsFin.tarifas,
      premissas: paramsFin.premissas ?? PREMISSAS_FINANCEIRAS_PADRAO,
    }),
    [paramsFin]
  )
  const temTarifa = paramsFin.tarifas.tarifaKwh > 0

  return (
    <div className="p-6">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-[var(--theme-text,#1a2340)]">Simulador Híbrido / Off-grid</h1>
      </div>
      <p className="mb-4 text-sm text-[var(--theme-text-muted,#6b7280)]">
        Dimensionamento fotovoltaico, banco de baterias, inversor e análise financeira completa.
      </p>

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        <Link href="/simuladores/hibrido-offgrid/equipamentos" className="text-[#3b6fd6] underline">
          Cadastro de equipamentos
        </Link>
        <Link href="/simuladores/hibrido-offgrid/cargas" className="text-[#3b6fd6] underline">
          Levantamento de cargas (tela dedicada)
        </Link>
      </div>

      <div className="space-y-4">
        <HibridoInputsProjeto campos={campos} onChange={setCampos} />
        <HibridoSelecaoEquipamentos campos={campos} equipamentos={equipamentos} onChange={setCampos} />

        <div className="rounded-xl border border-[var(--theme-border,#e7e9f2)] bg-[var(--theme-card,#fff)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--theme-text,#1a2340)]">Cargas</h2>
          <CargasBuilder
            cargas={cargas}
            onCargasChange={setCargas}
            biblioteca={biblioteca}
            onBibliotecaChange={setBiblioteca}
            premissas={premissas}
          />
        </div>

        <HibridoAvancado campos={campos} onChange={setCampos} />

        <HibridoAlertas alertas={resultado.alertas} />
        <HibridoResultadosFV dim={resultado.dimensionamento} strings={resultado.strings} />
        <HibridoProducaoMensal producaoMensalKwh={resultado.dimensionamento.producaoMensalKwh} />
        <HibridoResultadosArmazenamento bat={resultado.baterias} inv={resultado.inversor} />

        <HibridoInputsFinanceiro campos={camposFin} onChange={setCamposFin} />
        <HibridoResultadosCapex capex={financeiro.capex} />

        {!temTarifa ? (
          <div
            className="rounded-lg border border-[#f0d9a8] bg-[#fff6e6] px-3 py-2 text-xs text-[#b26b00]"
            data-testid="aviso-sem-tarifa"
          >
            Informe a tarifa de energia acima para ver a economia, os indicadores de viabilidade
            e a projeção. Sem tarifa não há economia a calcular.
          </div>
        ) : (
          <>
            <HibridoResultadosEconomia economia={economiaAno1} />
            <HibridoIndicadores indicadores={financeiro.indicadores} />
            <HibridoProjecao projecao={financeiro.projecao} />
          </>
        )}
      </div>
    </div>
  )
}
