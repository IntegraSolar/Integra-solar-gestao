// web/lib/simuladores/hibrido/snapshot.ts
// Snapshot versionado do estado da tela, para salvar e reabrir simulações.
//
// Guarda uma CÓPIA dos equipamentos usados, não só os ids: se o catálogo mudar
// depois (preço editado, equipamento excluído), reabrir precisa reproduzir os
// mesmos números que o cliente recebeu na proposta.
import { z } from 'zod'
import type { CamposHibrido, EquipamentosDisponiveis } from './montar-input'
import type { CamposFinanceiro } from './montar-financeiro'
import type { Carga, EquipPainel, EquipInversor, EquipBateria } from './types'

/**
 * Versão da forma do snapshot. Incrementar sempre que a estrutura mudar de modo
 * incompatível. Sem isso, um snapshot antigo restauraria pela metade em vez de
 * ser recusado — e o usuário levaria tempo para perceber que algo se perdeu.
 */
export const VERSAO_SNAPSHOT = 1

export type SnapshotSimulacao = {
  versao: number
  campos: CamposHibrido
  camposFin: CamposFinanceiro
  cargas: Carga[]
  equipamentos: {
    painel: EquipPainel | null
    inversor: EquipInversor | null
    bateria: EquipBateria | null
  }
}

const camposSchema = z.object({
  tempMediaC: z.number(),
  tempMaxC: z.number(),
  tempMinC: z.number(),
  hspMensal: z.array(z.number()).length(12),
  perdaSombreamento: z.number(),
  perdaOrientacao: z.number(),
  criterioGeracao: z.enum(['mes_critico', 'media_anual']),
  painelId: z.string(),
  inversorId: z.string(),
  bateriaId: z.string(),
  numModulos: z.string(),
  modulosPorString: z.string(),
  numStrings: z.string(),
  tensaoBancoV: z.string(),
  diasAutonomia: z.string(),
  baseEnergia: z.enum(['total', 'criticas']),
  tipoSistema: z.enum(['Híbrido', 'Off-grid', 'On-grid']),
  simultaneidade: z.string(),
  margemInversor: z.string(),
  dcAcMax: z.string(),
  dcAcMin: z.string(),
})

const camposFinSchema = z.object({
  tarifaKwh: z.string(),
  tusdFioBKwh: z.string(),
  disponibilidadeKwhMes: z.string(),
  moduloUnitario: z.string(),
  inversorUnitario: z.string(),
  bateriaUnitaria: z.string(),
  estruturaPorModulo: z.string(),
  cabeamentoPorKwp: z.string(),
  projetoArt: z.string(),
  maoDeObraPorKwp: z.string(),
  freteImprevistos: z.string(),
  bdi: z.string(),
  margemLucro: z.string(),
  impostos: z.string(),
  tma: z.string(),
  inflacaoTarifa: z.string(),
  degradacaoAnual: z.string(),
  omAnual: z.string(),
  horizonteAnos: z.string(),
  anoConexao: z.string(),
})

const cargaSchema = z.object({
  nome: z.string(),
  categoria: z.string().optional(),
  quantidade: z.number(),
  potenciaUnitW: z.number(),
  potenciaPartidaW: z.number(),
  tensaoV: z.number(),
  fatorPotencia: z.number(),
  horasDia: z.number(),
  diasSemana: z.number(),
  horaInicio: z.number(),
  horaFim: z.number(),
  prioridade: z.string().optional(),
  critica: z.boolean(),
})

// Equipamentos são validados de forma frouxa de propósito: o que importa é que
// o objeto tenha id e os campos que o motor lê. Um schema estrito replicaria
// o cadastro inteiro e quebraria snapshots antigos a cada campo novo opcional.
const equipamentoSchema = z.object({ id: z.string() }).passthrough().nullable()

const snapshotSchema = z.object({
  versao: z.literal(VERSAO_SNAPSHOT),
  campos: camposSchema,
  camposFin: camposFinSchema,
  cargas: z.array(cargaSchema),
  equipamentos: z.object({
    painel: equipamentoSchema,
    inversor: equipamentoSchema,
    bateria: equipamentoSchema,
  }),
})

// Guardas de compilação: se CamposHibrido ou CamposFinanceiro ganharem um campo
// e o schema não acompanhar, o tsc falha AQUI — em vez de o snapshot passar a
// recusar simulações válidas silenciosamente em produção.
const _camposOk: CamposHibrido = {} as z.infer<typeof camposSchema>
const _camposFinOk: CamposFinanceiro = {} as z.infer<typeof camposFinSchema>
const _camposReverso: z.infer<typeof camposSchema> = {} as CamposHibrido
const _camposFinReverso: z.infer<typeof camposFinSchema> = {} as CamposFinanceiro
void _camposOk; void _camposFinOk; void _camposReverso; void _camposFinReverso

export function montarSnapshot(
  campos: CamposHibrido,
  camposFin: CamposFinanceiro,
  cargas: Carga[],
  equipamentos: SnapshotSimulacao['equipamentos']
): SnapshotSimulacao {
  return { versao: VERSAO_SNAPSHOT, campos, camposFin, cargas, equipamentos }
}

/** Valida o snapshot bruto vindo do banco. Devolve `null` se não for confiável. */
export function lerSnapshot(bruto: unknown): SnapshotSimulacao | null {
  const r = snapshotSchema.safeParse(bruto)
  if (!r.success) return null
  return r.data as unknown as SnapshotSimulacao
}

/** Junta um item ao fim da lista, sem duplicar por id. */
function juntar<T extends { id: string }>(lista: T[], item: T | null): T[] {
  if (!item) return lista
  return lista.some((x) => x.id === item.id) ? lista : [...lista, item]
}

/**
 * Catálogo atual + equipamentos do snapshot que não estão mais nele.
 * Sem isso, reabrir uma simulação cujo painel foi excluído do cadastro zeraria
 * o dimensionamento, porque `montarHibridoInput` resolve por id.
 */
export function mesclarEquipamentos(
  catalogo: EquipamentosDisponiveis,
  doSnapshot: SnapshotSimulacao['equipamentos']
): EquipamentosDisponiveis {
  return {
    paineis: juntar(catalogo.paineis, doSnapshot.painel),
    inversores: juntar(catalogo.inversores, doSnapshot.inversor),
    baterias: juntar(catalogo.baterias, doSnapshot.bateria),
  }
}
