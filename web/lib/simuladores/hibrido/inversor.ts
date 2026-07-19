// web/lib/simuladores/hibrido/inversor.ts
// Requisitos e compatibilidade do inversor: potência contínua com margem,
// surge de partida, uso da entrada FV e paralelismo necessário.
import type { EquipInversor, Premissas, ResultadoInversor } from './types'

export type ParamsInversor = {
  inversor: EquipInversor | null
  potenciaSimultaneaW: number
  potenciaPartidaW: number
  potenciaInstaladaKwp: number
  premissas: Premissas
}

const VAZIO: ResultadoInversor = {
  potenciaCaMinimaW: 0, folgaPotenciaW: 0, utilizacaoContinua: 0,
  relacaoSurgePartida: 0, usoEntradaFv: 0, numInversoresParalelo: 0, potenciaCaTotalW: 0,
}

export function calcularInversor(params: ParamsInversor): ResultadoInversor {
  const { inversor, potenciaSimultaneaW, potenciaPartidaW, potenciaInstaladaKwp, premissas } = params

  const potenciaCaMinimaW = potenciaSimultaneaW * (1 + premissas.margemInversor)
  if (!inversor) return { ...VAZIO, potenciaCaMinimaW }

  const potCaNomW = inversor.potCaNomW
  const potenciaInstaladaW = potenciaInstaladaKwp * 1000

  const numInversoresParalelo =
    potCaNomW > 0 ? Math.ceil(potenciaCaMinimaW / potCaNomW) : 0

  return {
    potenciaCaMinimaW,
    folgaPotenciaW: potCaNomW - potenciaCaMinimaW,
    utilizacaoContinua: potCaNomW > 0 ? potenciaSimultaneaW / potCaNomW : 0,
    relacaoSurgePartida:
      inversor.potSurgeW != null && potenciaPartidaW > 0
        ? inversor.potSurgeW / potenciaPartidaW
        : 0,
    usoEntradaFv: inversor.potFvMaxWp > 0 ? potenciaInstaladaW / inversor.potFvMaxWp : 0,
    numInversoresParalelo,
    potenciaCaTotalW: numInversoresParalelo * potCaNomW,
  }
}
