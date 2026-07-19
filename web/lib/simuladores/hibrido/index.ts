// web/lib/simuladores/hibrido/index.ts
// Orquestrador do motor de cálculo do simulador Híbrido / Off-grid.
// Funções puras; nunca lança — entradas faltantes viram alertas.
import { calcularCargas } from './cargas'
import { calcularDimensionamento } from './dimensionamento'
import { calcularStrings } from './strings'
import { calcularBaterias } from './baterias'
import { calcularInversor } from './inversor'
import { calcularAlertas } from './alertas'
import { PREMISSAS_PADRAO } from './premissas'
import type { HibridoInput, Premissas, ResultadoHibrido } from './types'

export * from './types'
export { PREMISSAS_PADRAO, TECNOLOGIAS_BATERIA_PARAMS } from './premissas'

export function calcularHibrido(
  input: HibridoInput,
  premissas: Premissas = PREMISSAS_PADRAO
): ResultadoHibrido {
  const cargas = calcularCargas(input.cargas, premissas)

  const dimensionamento = calcularDimensionamento({
    projeto: input.projeto,
    painel: input.painel,
    consumoDiarioKwh: cargas.consumoDiarioKwh,
    potCaNomW: input.inversor?.potCaNomW ?? null,
    premissas,
    numModulos: input.numModulos,
  })

  const strings = calcularStrings({
    projeto: input.projeto,
    painel: input.painel,
    inversor: input.inversor,
    numModulos: dimensionamento.numModulos,
    premissas,
    modulosPorString: input.modulosPorString,
    numStrings: input.numStrings,
  })

  const baterias = calcularBaterias({
    bateria: input.bateria,
    inversor: input.inversor,
    consumoDiarioKwh: cargas.consumoDiarioKwh,
    consumoDiarioCriticoKwh: cargas.consumoDiarioCriticoKwh,
    potenciaSimultaneaW: cargas.potenciaSimultaneaW,
    premissas,
    tensaoBancoV: input.tensaoBancoV,
    diasAutonomia: input.diasAutonomia,
    baseEnergia: input.baseEnergia,
  })

  const inversor = calcularInversor({
    inversor: input.inversor,
    potenciaSimultaneaW: cargas.potenciaSimultaneaW,
    potenciaPartidaW: cargas.potenciaPartidaW,
    potenciaInstaladaKwp: dimensionamento.potenciaInstaladaKwp,
    premissas,
  })

  const correnteDescargaA =
    baterias.tensaoBancoV > 0 ? cargas.potenciaSimultaneaW / baterias.tensaoBancoV : 0

  const alertas = calcularAlertas({
    temPainel: input.painel != null,
    temInversor: input.inversor != null,
    temBateria: input.bateria != null,
    tensaoStringVocTminV: strings.tensaoStringVocTminV,
    tensaoCcMaxV: input.inversor?.tensaoCcMaxV ?? 0,
    tensaoStringVmpTmaxV: strings.tensaoStringVmpTmaxV,
    mpptMinV: input.inversor?.mpptMinV ?? 0,
    correntePorMpptA: strings.correntePorMpptA,
    corrMaxMpptA: input.inversor?.corrMaxMpptA ?? 0,
    oversizingDcAc: dimensionamento.oversizingDcAc,
    dcAcMax: premissas.dcAcMax,
    dcAcMin: premissas.dcAcMin,
    potenciaInstaladaW: dimensionamento.potenciaInstaladaKwp * 1000,
    potFvMaxWp: input.inversor?.potFvMaxWp ?? 0,
    modulosConfigurados: strings.modulosConfigurados,
    numModulos: dimensionamento.numModulos,
    producaoDiariaKwh: dimensionamento.producaoDiariaKwh,
    consumoDiarioKwh: cargas.consumoDiarioKwh,
    potenciaSimultaneaW: cargas.potenciaSimultaneaW,
    potCaNomW: input.inversor?.potCaNomW ?? 0,
    potSurgeW: input.inversor?.potSurgeW ?? null,
    potenciaPartidaW: cargas.potenciaPartidaW,
    tensaoBancoV: baterias.tensaoBancoV,
    tensaoCcBatV: input.inversor?.tensaoCcBatV ?? null,
    correnteDescargaA,
    correnteContinuaA: baterias.correnteContinuaA,
    autonomiaRealDias: baterias.autonomiaRealDias,
    diasAutonomia: input.diasAutonomia ?? premissas.diasAutonomia,
    tipoInversor: input.inversor?.tipo ?? null,
    tipoSistema: input.tipoSistema ?? null,
  })

  return { cargas, dimensionamento, strings, baterias, inversor, alertas }
}
