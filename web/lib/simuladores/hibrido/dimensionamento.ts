// web/lib/simuladores/hibrido/dimensionamento.ts
// Dimensionamento fotovoltaico: Performance Ratio, modelo térmico NOCT,
// número de módulos e estimativa de geração (método NREL/PVWatts).
import type { EquipPainel, Premissas, ProjetoInput, ResultadoDimensionamento } from './types'

/** PR base = produtório dos fatores de perda × eficiência do inversor. */
export function calcularPrBase(p: Premissas): number {
  return (
    (1 - p.soiling) *
    (1 - p.mismatch) *
    (1 - p.cabeamentoCC) *
    (1 - p.cabeamentoCA) *
    (1 - p.lid) *
    (1 - p.tolerancia) *
    (1 - p.indisponibilidade) *
    p.eficienciaInversor
  )
}

export type ParamsDimensionamento = {
  projeto: ProjetoInput
  painel: EquipPainel | null
  consumoDiarioKwh: number
  potCaNomW: number | null
  premissas: Premissas
  numModulos?: number
}

export function calcularDimensionamento(params: ParamsDimensionamento): ResultadoDimensionamento {
  const { projeto, painel, consumoDiarioKwh, potCaNomW, premissas, numModulos: numModulosOverride } = params

  const prBase = calcularPrBase(premissas)
  const prEfetivo = prBase * (1 - projeto.perdaSombreamento) * (1 - projeto.perdaOrientacao)

  const noct = painel?.noct ?? premissas.noctPadrao
  const coefPmp = painel?.coefPmp ?? premissas.coefPmpPadrao
  const tempCelulaC =
    projeto.tempMediaC + ((noct - 20) / premissas.gNoct) * premissas.gProjeto
  const fatorTemperatura = 1 + coefPmp * (tempCelulaC - premissas.tempRef)
  const prTotal = prEfetivo * fatorTemperatura

  const hsp = projeto.hspMensal
  const hspMediaAnual = hsp.length > 0 ? hsp.reduce((a, b) => a + b, 0) / hsp.length : 0
  const hspMesCritico = hsp.length > 0 ? Math.min(...hsp) : 0
  const mesCriticoIndice = hsp.length > 0 ? hsp.indexOf(hspMesCritico) : -1
  const hspDimensionamento =
    projeto.criterioGeracao === 'media_anual' ? hspMediaAnual : hspMesCritico

  const potenciaWp = painel?.potenciaWp ?? 0
  const energiaPorModuloKwhDia = (potenciaWp / 1000) * hspDimensionamento * prTotal
  const numModulosRecomendado =
    energiaPorModuloKwhDia > 0 && consumoDiarioKwh > 0
      ? Math.ceil(consumoDiarioKwh / energiaPorModuloKwhDia)
      : 0

  const numModulos = numModulosOverride ?? numModulosRecomendado
  const potenciaInstaladaKwp = (numModulos * potenciaWp) / 1000
  const areaTotalM2 = numModulos * (painel?.areaM2 ?? 0)

  const producaoDiariaKwh = potenciaInstaladaKwp * hspDimensionamento * prTotal
  const producaoMensalKwh = hsp.map(
    (h, i) => potenciaInstaladaKwp * h * (projeto.diasMes[i] ?? 0) * prTotal
  )
  const producaoAnualKwh = producaoMensalKwh.reduce((a, b) => a + b, 0)

  const oversizingDcAc =
    potCaNomW && potCaNomW > 0 ? (potenciaInstaladaKwp * 1000) / potCaNomW : 0

  return {
    prBase, prEfetivo, tempCelulaC, fatorTemperatura, prTotal,
    hspMediaAnual, hspMesCritico, mesCriticoIndice, hspDimensionamento,
    energiaPorModuloKwhDia, numModulosRecomendado, numModulos,
    potenciaInstaladaKwp, areaTotalM2,
    producaoDiariaKwh, producaoMensalKwh, producaoAnualKwh,
    oversizingDcAc,
  }
}
