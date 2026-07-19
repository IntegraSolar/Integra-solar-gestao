// web/lib/simuladores/hibrido/strings.ts
// Arranjo série/paralelo e verificação elétrica (NBR 16690):
// Voc no frio (pior caso de sobretensão) e Vmp no calor (pior caso de MPPT mínimo).
import type { EquipPainel, EquipInversor, Premissas, ProjetoInput, ResultadoStrings } from './types'

export type ParamsStrings = {
  projeto: ProjetoInput
  painel: EquipPainel | null
  inversor: EquipInversor | null
  numModulos: number
  premissas: Premissas
  modulosPorString?: number
  numStrings?: number
}

const VAZIO: ResultadoStrings = {
  vocTminV: 0, vmpTmaxV: 0, maxModulosPorString: 0, minModulosPorString: 0,
  modulosPorString: 0, numStrings: 0, tensaoStringVocTminV: 0, tensaoStringVmpTmaxV: 0,
  correnteStringIscA: 0, correnteProjetoA: 0, correntePorMpptA: 0, modulosConfigurados: 0,
}

export function calcularStrings(params: ParamsStrings): ResultadoStrings {
  const { projeto, painel, inversor, numModulos, premissas } = params
  if (!painel || !inversor) return { ...VAZIO }

  const coefVoc = painel.coefVoc ?? premissas.coefVocPadrao
  const noct = painel.noct ?? premissas.noctPadrao

  const vocTminV = painel.voc * (1 + coefVoc * (projeto.tempMinC - premissas.tempRef))
  const tempCelulaMaxC =
    projeto.tempMaxC + ((noct - 20) / premissas.gNoct) * premissas.gProjeto
  const vmpTmaxV = painel.vmp * (1 + coefVoc * (tempCelulaMaxC - premissas.tempRef))

  const maxModulosPorString = vocTminV > 0 ? Math.floor(inversor.tensaoCcMaxV / vocTminV) : 0
  const minModulosPorString = vmpTmaxV > 0 ? Math.ceil(inversor.mpptMinV / vmpTmaxV) : 0

  const modulosPorString = params.modulosPorString ?? maxModulosPorString
  const numStrings =
    params.numStrings ?? (modulosPorString > 0 ? Math.ceil(numModulos / modulosPorString) : 0)

  const correntePorMpptA =
    inversor.numMppt > 0 ? Math.ceil(numStrings / inversor.numMppt) * painel.isc : 0

  return {
    vocTminV,
    vmpTmaxV,
    maxModulosPorString,
    minModulosPorString,
    modulosPorString,
    numStrings,
    tensaoStringVocTminV: vocTminV * modulosPorString,
    tensaoStringVmpTmaxV: vmpTmaxV * modulosPorString,
    correnteStringIscA: painel.isc,
    correnteProjetoA: painel.isc * premissas.fatorCorrenteIsc,
    correntePorMpptA,
    modulosConfigurados: modulosPorString * numStrings,
  }
}
