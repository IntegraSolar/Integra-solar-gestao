// web/lib/simuladores/hibrido/montar-input.ts
// Ponte pura entre os campos da tela e o input do motor de cálculo.
// Nenhuma fórmula vive aqui — só tradução de formulário para domínio.

import { PREMISSAS_PADRAO } from './premissas'
import type {
  Carga, EquipPainel, EquipInversor, EquipBateria, HibridoInput, Premissas,
} from './types'

/**
 * Interpreta a linha de 12 valores de HSP colada do CRESESB/PVGIS.
 * Devolve `null` se não encontrar exatamente 12 números válidos.
 *
 * A ambiguidade da vírgula (decimal ou separador de lista) é resolvida pela
 * composição do texto, sem tentativa e erro. Isso funciona porque HSP no Brasil
 * fica entre ~3 e ~7 kWh/m²·dia: sempre um dígito antes do decimal, nunca com
 * separador de milhar.
 */
export function parseHspColado(texto: string): number[] | null {
  const t = texto.trim()
  if (t === '') return null

  const temPonto = t.includes('.')
  const temVirgula = t.includes(',')

  let normalizado: string
  if (temPonto && temVirgula) {
    // Ponto é o decimal e a vírgula separa a lista: "4.75, 4.71, …"
    normalizado = t.replace(/,/g, ' ')
  } else if (temVirgula) {
    // Só vírgula: é o decimal. "4,75 4,71 …"
    normalizado = t.replace(/,/g, '.')
  } else {
    normalizado = t
  }

  const tokens = normalizado.split(/[\s;]+/).filter((s) => s !== '')
  if (tokens.length !== 12) return null

  const numeros = tokens.map(Number)
  if (numeros.some((n) => !Number.isFinite(n))) return null
  return numeros
}

/** Dias de cada mês. Calendário, não entrada do usuário. */
export const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/**
 * Campos coletados na tela. Os overrides são `string` de propósito: é o que o
 * input do formulário produz, e permite distinguir "em branco" (usar o default
 * do motor) de "zero" (o usuário digitou 0).
 */
export type CamposHibrido = {
  // Clima
  tempMediaC: number
  tempMaxC: number
  tempMinC: number
  hspMensal: number[]
  // Arranjo
  perdaSombreamento: number
  perdaOrientacao: number
  criterioGeracao: 'mes_critico' | 'media_anual'
  // Equipamentos selecionados
  painelId: string
  inversorId: string
  bateriaId: string
  // Avançado — arranjo e banco
  numModulos: string
  modulosPorString: string
  numStrings: string
  tensaoBancoV: string
  diasAutonomia: string
  baseEnergia: 'total' | 'criticas'
  tipoSistema: 'Híbrido' | 'Off-grid' | 'On-grid'
  // Avançado — premissas
  simultaneidade: string
  margemInversor: string
  dcAcMax: string
  dcAcMin: string
}

export const CAMPOS_INICIAIS: CamposHibrido = {
  tempMediaC: 25,
  tempMaxC: 35,
  tempMinC: 15,
  hspMensal: new Array(12).fill(5),
  perdaSombreamento: 0.03,
  perdaOrientacao: 0.02,
  criterioGeracao: 'mes_critico',
  painelId: '',
  inversorId: '',
  bateriaId: '',
  numModulos: '',
  modulosPorString: '',
  numStrings: '',
  tensaoBancoV: '',
  diasAutonomia: '',
  baseEnergia: 'total',
  tipoSistema: 'Híbrido',
  simultaneidade: '',
  margemInversor: '',
  dcAcMax: '',
  dcAcMin: '',
}

export type EquipamentosDisponiveis = {
  paineis: EquipPainel[]
  inversores: EquipInversor[]
  baterias: EquipBateria[]
}

/**
 * Campo opcional: em branco (ou inválido) devolve `undefined`, para a chave ser
 * omitida do input e o motor aplicar seu próprio default. `'0'` devolve `0` —
 * o usuário digitou zero de propósito.
 */
function opcionalNum(v: string): number | undefined {
  const t = v.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function montarHibridoInput(
  campos: CamposHibrido,
  equipamentos: EquipamentosDisponiveis,
  cargas: Carga[]
): HibridoInput {
  return {
    projeto: {
      hspMensal: campos.hspMensal,
      diasMes: DIAS_MES,
      tempMediaC: campos.tempMediaC,
      tempMaxC: campos.tempMaxC,
      tempMinC: campos.tempMinC,
      perdaSombreamento: campos.perdaSombreamento,
      perdaOrientacao: campos.perdaOrientacao,
      criterioGeracao: campos.criterioGeracao,
    },
    cargas,
    painel: equipamentos.paineis.find((p) => p.id === campos.painelId) ?? null,
    inversor: equipamentos.inversores.find((i) => i.id === campos.inversorId) ?? null,
    bateria: equipamentos.baterias.find((b) => b.id === campos.bateriaId) ?? null,
    numModulos: opcionalNum(campos.numModulos),
    modulosPorString: opcionalNum(campos.modulosPorString),
    numStrings: opcionalNum(campos.numStrings),
    tensaoBancoV: opcionalNum(campos.tensaoBancoV),
    diasAutonomia: opcionalNum(campos.diasAutonomia),
    baseEnergia: campos.baseEnergia,
    tipoSistema: campos.tipoSistema,
  }
}

/** Premissas padrão com as customizações da tela sobrepostas, quando preenchidas. */
export function montarPremissas(campos: CamposHibrido): Premissas {
  const simultaneidade = opcionalNum(campos.simultaneidade)
  const margemInversor = opcionalNum(campos.margemInversor)
  const dcAcMax = opcionalNum(campos.dcAcMax)
  const dcAcMin = opcionalNum(campos.dcAcMin)
  return {
    ...PREMISSAS_PADRAO,
    ...(simultaneidade !== undefined ? { simultaneidade } : {}),
    ...(margemInversor !== undefined ? { margemInversor } : {}),
    ...(dcAcMax !== undefined ? { dcAcMax } : {}),
    ...(dcAcMin !== undefined ? { dcAcMin } : {}),
  }
}
