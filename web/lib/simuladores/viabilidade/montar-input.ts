// web/lib/simuladores/viabilidade/montar-input.ts
import type { ViabilidadeInput, ModalidadeGD } from './types'
import { concessionariaParaInputs, type ConcessionariaBruta } from './concessionaria'

// Premissas do cenário (defaults). Valores EXATOS do golden da Peça 1.
export type Premissas = {
  reajusteTarifaAnual: number
  degradacaoAnual: number
  tma: number
  opexPct: number
  impostoPct: number
  d23: number
  sunneSetupMicro: number
  sunneSetupMini: number
  jurosAnual: number
  prazoMeses: number
  horizonteAnos: number
  anoInicial: number
  fioBSchedule: number[]
}

export const PREMISSAS_DEFAULT: Readonly<Premissas> = {
  reajusteTarifaAnual: 0.08,
  degradacaoAnual: 0.015,
  tma: 0.1,
  opexPct: 0.081199185409699712,
  impostoPct: 0.045,
  d23: 0.125,
  sunneSetupMicro: 5000,
  sunneSetupMini: 10000,
  jurosAnual: 0.1,
  prazoMeses: 12,
  horizonteAnos: 25,
  anoInicial: 2025,
  fioBSchedule: [0.6, 0.75, 0.9, ...Array<number>(22).fill(1)],
}

// Campos coletados na tela (por-negócio). Modalidade só GD1/GD2 (motor não faz GD3 ainda).
export type CamposSimulador = {
  numPaineis: number
  potenciaPainelWp: number
  numInversores: number
  potenciaInversorKw: number
  fatorCapacidade: number
  modalidade: Extract<ModalidadeGD, 'GD1' | 'GD2'>
  valorInvestimento: number
  descontoLocacao: number
  pctFinanciado: number
  premissas?: Partial<Premissas>
}

export function montarViabilidadeInput(campos: CamposSimulador, conc: ConcessionariaBruta): ViabilidadeInput {
  const p: Premissas = { ...PREMISSAS_DEFAULT, ...(campos.premissas ?? {}) }
  const derivados = concessionariaParaInputs(conc)
  return {
    numPaineis: campos.numPaineis,
    potenciaPainelWp: campos.potenciaPainelWp,
    numInversores: campos.numInversores,
    potenciaInversorKw: campos.potenciaInversorKw,
    fatorCapacidade: campos.fatorCapacidade,
    modalidade: campos.modalidade,
    valorInvestimento: campos.valorInvestimento,
    descontoLocacao: campos.descontoLocacao,
    pctFinanciado: campos.pctFinanciado,
    ...derivados, // tusdFioB, tarifaLocacaoBase, tarifaDemanda
    ...p, // as 13 premissas (todas são campos de ViabilidadeInput)
    fioBSchedule: [...p.fioBSchedule], // cópia — não compartilha a ref do default
  }
}
