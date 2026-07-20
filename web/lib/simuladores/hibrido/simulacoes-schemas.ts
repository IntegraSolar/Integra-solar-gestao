// web/lib/simuladores/hibrido/simulacoes-schemas.ts
// Schema de salvar e mapeadores row<->objeto das simulações salvas.
// Módulo puro (sem 'use server') para ser testável isoladamente.
import { z } from 'zod'

export const salvarSimulacaoSchema = z.object({
  nome: z.string().min(1, 'Dê um nome à simulação.'),
  snapshot: z.unknown(),
  clienteNome: z.string().nullish(),
  clienteCidade: z.string().nullish(),
  clienteUf: z.string().nullish(),
  concessionaria: z.string().nullish(),
  responsavelTecnico: z.string().nullish(),
  potenciaKwp: z.coerce.number(),
  investimentoTotal: z.coerce.number(),
  vpl: z.coerce.number(),
  tir: z.coerce.number(),
  // Nullable de propósito: o investimento pode não se pagar no horizonte, e
  // gravar 0 nesse caso leria como "se paga imediatamente".
  paybackAnos: z.coerce.number().nullable(),
  // Descritivos do projeto (Memorial). Todos opcionais e nullable: 0 é um
  // azimute válido (Norte), então "não informado" precisa ser null, não 0.
  azimute: z.coerce.number().nullish(),
  inclinacao: z.coerce.number().nullish(),
  latitude: z.coerce.number().nullish(),
  longitude: z.coerce.number().nullish(),
  altitude: z.coerce.number().nullish(),
  tipoLigacao: z.string().nullish(),
  tensaoNominal: z.coerce.number().nullish(),
  modoOperacao: z.string().nullish(),
})

export type SalvarSimulacaoData = z.infer<typeof salvarSimulacaoSchema>

/** O que a listagem precisa — sem o snapshot, que vem sob demanda ao reabrir. */
export type SimulacaoResumo = {
  id: string
  nome: string
  clienteNome: string | null
  clienteCidade: string | null
  potenciaKwp: number
  investimentoTotal: number
  vpl: number
  tir: number
  paybackAnos: number | null
  createdAt: string
}

/** Resumo + identificação completa + snapshot, para reabrir. */
export type SimulacaoCompleta = SimulacaoResumo & {
  clienteUf: string | null
  concessionaria: string | null
  responsavelTecnico: string | null
  snapshot: unknown
  azimute: number | null
  inclinacao: number | null
  latitude: number | null
  longitude: number | null
  altitude: number | null
  tipoLigacao: string | null
  tensaoNominal: number | null
  modoOperacao: string | null
}

const s = (v: unknown): string | null => (v === null || v === undefined ? null : String(v))
const n = (v: unknown): number => Number(v ?? 0)
/** Numérico opcional: `null` continua `null` — 0 é valor legítimo. */
const nOuNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v)

export function rowToResumo(r: Record<string, unknown>): SimulacaoResumo {
  return {
    id: String(r.id),
    nome: String(r.nome),
    clienteNome: s(r.cliente_nome),
    clienteCidade: s(r.cliente_cidade),
    potenciaKwp: n(r.potencia_kwp),
    investimentoTotal: n(r.investimento_total),
    vpl: n(r.vpl),
    tir: n(r.tir),
    paybackAnos: r.payback_anos === null || r.payback_anos === undefined ? null : Number(r.payback_anos),
    createdAt: String(r.created_at),
  }
}

export function rowToCompleta(r: Record<string, unknown>): SimulacaoCompleta {
  return {
    ...rowToResumo(r),
    clienteUf: s(r.cliente_uf),
    concessionaria: s(r.concessionaria),
    responsavelTecnico: s(r.responsavel_tecnico),
    snapshot: r.snapshot,
    azimute: nOuNull(r.azimute),
    inclinacao: nOuNull(r.inclinacao),
    latitude: nOuNull(r.latitude),
    longitude: nOuNull(r.longitude),
    altitude: nOuNull(r.altitude),
    tipoLigacao: s(r.tipo_ligacao),
    tensaoNominal: nOuNull(r.tensao_nominal),
    modoOperacao: s(r.modo_operacao),
  }
}

export function salvarDataToRow(d: SalvarSimulacaoData) {
  return {
    nome: d.nome,
    snapshot: d.snapshot,
    cliente_nome: d.clienteNome ?? null,
    cliente_cidade: d.clienteCidade ?? null,
    cliente_uf: d.clienteUf ?? null,
    concessionaria: d.concessionaria ?? null,
    responsavel_tecnico: d.responsavelTecnico ?? null,
    potencia_kwp: d.potenciaKwp,
    investimento_total: d.investimentoTotal,
    vpl: d.vpl,
    tir: d.tir,
    payback_anos: d.paybackAnos,
    azimute: d.azimute ?? null,
    inclinacao: d.inclinacao ?? null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    altitude: d.altitude ?? null,
    tipo_ligacao: d.tipoLigacao ?? null,
    tensao_nominal: d.tensaoNominal ?? null,
    modo_operacao: d.modoOperacao ?? null,
  }
}
