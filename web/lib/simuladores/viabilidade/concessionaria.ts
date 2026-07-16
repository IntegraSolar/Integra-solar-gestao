// web/lib/simuladores/viabilidade/concessionaria.ts
import { z } from 'zod'
import type { ViabilidadeInput } from './types'

// Campos BRUTOS (amarelo) — digitados pelo usuário. Espelham as colunas
// B,D,E,F,H,J,L,N,Q,R,V,X,AA da aba "Premissas Básicas".
export type ConcessionariaBruta = {
  nome: string
  tipoProcesso: string
  tusd: number                    // E  (R$/MWh)
  te: number                      // F  (R$/MWh)
  tusdFioB: number                // H  (R$/MWh) — valor, não a fração
  tusdFioA: number                // J  (R$/MWh) — total dos componentes
  tusdPeD: number                 // L  (R$/MWh)
  tusdTfsee: number               // N  (R$/MWh)
  icms: number                    // Q  (fração)
  pisCofins: number               // R  (fração)
  demandaContratadaSemImp: number // V  (R$/kW)
  demandaGeracaoSemImp: number    // X  (R$/kW)
  aplicaReajuste1430: boolean     // AA ("Sim"/"Não")
}

// Campos DERIVADOS (cinza) — recalculados, nunca gravados.
export type ConcessionariaDerivada = {
  tarifaTotalSemImp: number             // G = E+F
  fracFioB: number                      // I = H/G
  fracFioA: number                      // K = J/G
  fracPeD: number                       // M = L/G
  fracTfsee: number                     // O = N/G
  fracGD3Total: number                  // P = (H+J+L+N)/G
  tarifaTotalComImp: number             // S = G/((1-Q)(1-R))
  tarifaCompensavelAutoconsumo: number  // T = S
  tarifaCompensavelCompartilhada: number// U = G
  demandaContratadaComImp: number       // W = V/((1-0)(1-R))  — ICMS=0
  demandaGeracaoComImp: number          // Y = X/((1-Q)(1-R))
  reducaoDcDg: number                   // Z = 1 - Y/W
}

// Porta as colunas calculadas (cinza) da planilha. Pura, sem I/O.
export function derivarConcessionaria(b: ConcessionariaBruta): ConcessionariaDerivada {
  const G = b.tusd + b.te
  const comImposto = (semImposto: number, icms: number) =>
    semImposto / ((1 - icms) * (1 - b.pisCofins))
  const tarifaTotalComImp = comImposto(G, b.icms)                  // S
  const demandaContratadaComImp = comImposto(b.demandaContratadaSemImp, 0) // W (ICMS=0)
  const demandaGeracaoComImp = comImposto(b.demandaGeracaoSemImp, b.icms)  // Y
  return {
    tarifaTotalSemImp: G,
    fracFioB: b.tusdFioB / G,
    fracFioA: b.tusdFioA / G,
    fracPeD: b.tusdPeD / G,
    fracTfsee: b.tusdTfsee / G,
    fracGD3Total: (b.tusdFioB + b.tusdFioA + b.tusdPeD + b.tusdTfsee) / G,
    tarifaTotalComImp,
    tarifaCompensavelAutoconsumo: tarifaTotalComImp,               // T = S
    tarifaCompensavelCompartilhada: G,                             // U = G
    demandaContratadaComImp,
    demandaGeracaoComImp,
    reducaoDcDg: 1 - demandaGeracaoComImp / demandaContratadaComImp,
  }
}

// Campos que a concessionária fornece ao motor de viabilidade (Peça 1).
// reajusteTarifaAnual/descontoLocacao/etc. NÃO vêm daqui — são do cenário.
export type ConcessionariaInputs = Pick<
  ViabilidadeInput,
  'tusdFioB' | 'tarifaLocacaoBase' | 'tarifaDemanda'
>

export function concessionariaParaInputs(b: ConcessionariaBruta): ConcessionariaInputs {
  const d = derivarConcessionaria(b)
  return {
    tusdFioB: d.fracFioB,                                  // fração (col I)
    tarifaLocacaoBase: d.tarifaCompensavelCompartilhada / 1000, // U em R$/MWh -> R$/kWh
    // TODO-demanda-nao-reajuste: ramo `false` (Demanda Contratada) sem golden na planilha.
    tarifaDemanda: b.aplicaReajuste1430 ? d.demandaGeracaoComImp : d.demandaContratadaComImp,
  }
}

// Validação dos campos brutos (amarelo). Numéricos >= 0; frações em [0,1].
export const concessionariaBrutaSchema = z.object({
  nome: z.string().min(1, 'Nome da concessionária é obrigatório.'),
  tipoProcesso: z.string().min(1, 'Tipo de processo é obrigatório.'),
  tusd: z.coerce.number().nonnegative(),
  te: z.coerce.number().nonnegative(),
  tusdFioB: z.coerce.number().nonnegative(),
  tusdFioA: z.coerce.number().nonnegative(),
  tusdPeD: z.coerce.number().nonnegative(),
  tusdTfsee: z.coerce.number().nonnegative(),
  icms: z.coerce.number().min(0).max(1, 'ICMS deve ser fração (0.18 = 18%).'),
  pisCofins: z.coerce.number().min(0).max(1, 'Pis/Cofins deve ser fração.'),
  demandaContratadaSemImp: z.coerce.number().nonnegative(),
  demandaGeracaoSemImp: z.coerce.number().nonnegative(),
  aplicaReajuste1430: z.coerce.boolean(),
})
