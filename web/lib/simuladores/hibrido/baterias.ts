// web/lib/simuladores/hibrido/baterias.ts
// Dimensionamento do banco por energia:
// Cn = (E_diária × Autonomia) / (DOD_útil × η_bateria × η_carregador),
// com verificação cruzada por corrente (C-rate).
import { TECNOLOGIAS_BATERIA_PARAMS } from './premissas'
import type { EquipBateria, EquipInversor, Premissas, ResultadoBaterias, TecnologiaBateria } from './types'

export type ParamsBaterias = {
  bateria: EquipBateria | null
  inversor: EquipInversor | null
  consumoDiarioKwh: number
  consumoDiarioCriticoKwh: number
  potenciaSimultaneaW: number
  premissas: Premissas
  tensaoBancoV?: number
  diasAutonomia?: number
  baseEnergia?: 'total' | 'criticas'
}

const VAZIO: ResultadoBaterias = {
  tensaoBancoV: 0, dodNominal: 0, socMin: 0, eficienciaRoundTrip: 0, energiaBateriaKwh: 0,
  dodUtil: 0, etaSistema: 0, energiaDiariaConsideradaKwh: 0, energiaUtilNecessariaKwh: 0,
  energiaNominalBancoKwh: 0, capacidadeNominalAh: 0, bateriasSerie: 0, stringsParalelo: 0,
  numBaterias: 0, energiaInstaladaKwh: 0, capacidadeBancoAh: 0, energiaUtilRealKwh: 0,
  autonomiaRealDias: 0, correnteMaxDescargaA: 0, correnteContinuaA: 0,
  potenciaMaxDescargaKw: 0, cRateDescarga: 0, tempoRecargaH: 0, vidaUtilAnos: 0,
}

export function calcularBaterias(params: ParamsBaterias): ResultadoBaterias {
  const { bateria, inversor, premissas, potenciaSimultaneaW } = params
  if (!bateria) return { ...VAZIO }

  const tec = TECNOLOGIAS_BATERIA_PARAMS[bateria.tecnologia as TecnologiaBateria]
  const tensaoBancoV = params.tensaoBancoV ?? inversor?.tensaoCcBatV ?? 48
  const diasAutonomia = params.diasAutonomia ?? premissas.diasAutonomia
  const baseEnergia = params.baseEnergia ?? 'total'

  const dodNominal = bateria.dod != null ? bateria.dod / 100 : (tec?.dod ?? 0.8)
  const socMin = bateria.socMin != null ? bateria.socMin / 100 : premissas.socMin
  const eficienciaRoundTrip =
    bateria.eficiencia != null ? bateria.eficiencia / 100 : (tec?.eficiencia ?? 0.9)
  const ciclos = bateria.ciclos ?? tec?.ciclos ?? 3000
  const energiaBateriaKwh =
    bateria.energiaKwh ?? (bateria.tensaoV * bateria.capacidadeAh) / 1000

  const dodUtil = Math.min(dodNominal, premissas.socMax - socMin)
  const etaSistema = eficienciaRoundTrip * premissas.eficienciaCarregador

  const energiaDiariaConsideradaKwh =
    baseEnergia === 'criticas' ? params.consumoDiarioCriticoKwh : params.consumoDiarioKwh
  const energiaUtilNecessariaKwh = energiaDiariaConsideradaKwh * diasAutonomia

  const denom = dodUtil * etaSistema
  const energiaNominalBancoKwh = denom > 0 ? energiaUtilNecessariaKwh / denom : 0
  const capacidadeNominalAh =
    tensaoBancoV > 0 ? (energiaNominalBancoKwh * 1000) / tensaoBancoV : 0

  const bateriasSerie = bateria.tensaoV > 0 ? Math.round(tensaoBancoV / bateria.tensaoV) : 0
  const capacidadeStringKwh = energiaBateriaKwh * bateriasSerie
  const stringsParalelo =
    capacidadeStringKwh > 0 ? Math.ceil(energiaNominalBancoKwh / capacidadeStringKwh) : 0
  const numBaterias = bateriasSerie * stringsParalelo

  const energiaInstaladaKwh = numBaterias * energiaBateriaKwh
  const capacidadeBancoAh = stringsParalelo * bateria.capacidadeAh
  const energiaUtilRealKwh = energiaInstaladaKwh * dodUtil * etaSistema
  const autonomiaRealDias =
    energiaDiariaConsideradaKwh > 0 ? energiaUtilRealKwh / energiaDiariaConsideradaKwh : 0

  const correnteMaxDescargaA = (bateria.corrMaxA ?? 0) * stringsParalelo
  const correnteContinuaA = (bateria.corrRecomA ?? 0) * stringsParalelo
  const potenciaMaxDescargaKw = (tensaoBancoV * correnteMaxDescargaA) / 1000
  const cRateDescarga =
    tensaoBancoV > 0 && capacidadeBancoAh > 0
      ? (potenciaSimultaneaW / tensaoBancoV) / capacidadeBancoAh
      : 0
  const potenciaRecargaKw = (correnteContinuaA * tensaoBancoV) / 1000
  const tempoRecargaH = potenciaRecargaKw > 0 ? energiaUtilRealKwh / potenciaRecargaKw : 0

  return {
    tensaoBancoV, dodNominal, socMin, eficienciaRoundTrip, energiaBateriaKwh,
    dodUtil, etaSistema, energiaDiariaConsideradaKwh, energiaUtilNecessariaKwh,
    energiaNominalBancoKwh, capacidadeNominalAh, bateriasSerie, stringsParalelo,
    numBaterias, energiaInstaladaKwh, capacidadeBancoAh, energiaUtilRealKwh,
    autonomiaRealDias, correnteMaxDescargaA, correnteContinuaA,
    potenciaMaxDescargaKw, cRateDescarga, tempoRecargaH,
    vidaUtilAnos: ciclos / 365,
  }
}
