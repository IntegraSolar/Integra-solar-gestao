// web/lib/simuladores/hibrido/cargas.ts
// Agregação da lista de cargas e curva de demanda de 24 horas.
import type { Carga, Premissas, ResultadoCargas } from './types'

/** Corrente da carga: I = qtd × P / (V × FP). Retorna 0 se o denominador for 0. */
export function correnteDaCarga(c: Carga): number {
  const den = c.tensaoV * c.fatorPotencia
  if (den === 0) return 0
  return (c.quantidade * c.potenciaUnitW) / den
}

/** Há sobreposição entre os intervalos [a1,a2) e [b1,b2)? */
function sobrepoe(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2
}

/**
 * A carga está ativa durante a hora cheia [h, h+1)?
 * Intervalos com fim <= início atravessam a meia-noite (ex.: 18h→06h).
 * Um intervalo nulo (fim === início) é considerado inativo.
 */
export function ativaNaHora(horaInicio: number, horaFim: number, h: number): boolean {
  if (horaFim === horaInicio) return false
  if (horaFim > horaInicio) return sobrepoe(horaInicio, horaFim, h, h + 1)
  return sobrepoe(horaInicio, 24, h, h + 1) || sobrepoe(0, horaFim, h, h + 1)
}

export function calcularCargas(cargas: Carga[], premissas: Premissas): ResultadoCargas {
  let consumoDiarioWh = 0
  let consumoDiarioCriticoWh = 0
  let potenciaConectadaW = 0
  let potenciaPartidaW = 0

  for (const c of cargas) {
    const consumo = c.quantidade * c.potenciaUnitW * c.horasDia * (c.diasSemana / 7)
    consumoDiarioWh += consumo
    if (c.critica) consumoDiarioCriticoWh += consumo
    potenciaConectadaW += c.quantidade * c.potenciaUnitW
    potenciaPartidaW += c.quantidade * c.potenciaPartidaW
  }

  const curva24h = new Array(24).fill(0)
  for (let h = 0; h < 24; h++) {
    let somaW = 0
    for (const c of cargas) {
      if (ativaNaHora(c.horaInicio, c.horaFim, h)) somaW += c.quantidade * c.potenciaUnitW
    }
    curva24h[h] = somaW
  }

  return {
    consumoDiarioWh,
    consumoDiarioKwh: consumoDiarioWh / 1000,
    consumoMensalKwh: (consumoDiarioWh * 30) / 1000,
    consumoAnualKwh: (consumoDiarioWh * 365) / 1000,
    consumoDiarioCriticoWh,
    consumoDiarioCriticoKwh: consumoDiarioCriticoWh / 1000,
    potenciaConectadaW,
    potenciaSimultaneaW: potenciaConectadaW * premissas.simultaneidade,
    potenciaPartidaW,
    curva24h,
    picoDemandaW: Math.max(0, ...curva24h),
  }
}
