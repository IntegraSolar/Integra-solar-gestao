// web/lib/simuladores/hibrido/economia.ts
// Economia de um ano: autoconsumo compensado, crédito do excedente injetado
// (descontado o TUSD Fio B com a rampa da Lei 14.300) e custo de
// disponibilidade. Recomposta ano a ano — a rampa impede escalar o ano 1.
import type {
  FisicoParaFinanceiro, PremissasFinanceiras, ResultadoEconomiaAno, TarifasInput,
} from './types'

export type ParamsEconomia = {
  fisico: FisicoParaFinanceiro
  tarifas: TarifasInput
  premissas: PremissasFinanceiras
}

/** `ano` é 1-indexado (ano 1 = primeiro ano de operação). */
export function calcularEconomiaAno(ano: number, params: ParamsEconomia): ResultadoEconomiaAno {
  const { fisico, tarifas, premissas } = params
  const expo = ano - 1

  const fatorInflacao = Math.pow(1 + premissas.inflacaoTarifa, expo)
  const geracaoKwh = fisico.producaoAnualKwh * Math.pow(1 - premissas.degradacaoAnual, expo)

  const autoconsumoKwh = Math.min(geracaoKwh, fisico.consumoAnualKwh)
  const excedenteKwh = Math.max(0, geracaoKwh - fisico.consumoAnualKwh)

  const tarifaAno = tarifas.tarifaKwh * fatorInflacao
  const fatorFioB = premissas.fioBSchedule[expo] ?? 1
  const tusdAno = tarifas.tusdFioBKwh * fatorInflacao * fatorFioB

  const economiaAutoconsumo = autoconsumoKwh * tarifaAno
  const creditoExcedente = excedenteKwh * Math.max(0, tarifaAno - tusdAno)
  const custoDisponibilidade = tarifas.disponibilidadeKwhMes * 12 * tarifaAno

  return {
    ano,
    geracaoKwh,
    autoconsumoKwh,
    excedenteKwh,
    tarifaAno,
    tusdAno,
    economiaAutoconsumo,
    creditoExcedente,
    custoDisponibilidade,
    economiaLiquida: Math.max(0, economiaAutoconsumo + creditoExcedente - custoDisponibilidade),
  }
}
