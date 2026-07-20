// web/lib/simuladores/hibrido/documento-tipos.ts
// Tipos compartilhados pelos documentos gerados (Memorial e Relatório).
import type { DadosProjeto } from '@/components/simuladores/HibridoIdentificacao'
import type {
  ProjetoInput, ResultadoHibrido, ResultadoFinanceiro, ResultadoEconomiaAno,
  EquipPainel, EquipInversor, EquipBateria,
} from './types'
import type { CamposFinanceiro } from './montar-financeiro'

export type SecaoDocumento = {
  titulo: string
  paragrafos?: string[]
  linhas?: { rotulo: string; valor: string }[]
}

export type DadosMemorial = {
  dados: DadosProjeto
  projeto: ProjetoInput
  resultado: ResultadoHibrido
  painel: EquipPainel | null
  inversor: EquipInversor | null
  bateria: EquipBateria | null
  /** Vem de `campos.tipoSistema` (painel avançado), não de DadosProjeto. */
  tipoSistema: string
}

export type DadosRelatorio = DadosMemorial & {
  financeiro: ResultadoFinanceiro
  economiaAno1: ResultadoEconomiaAno
  camposFin: CamposFinanceiro
  /** Entra por parâmetro: a função de conteúdo não lê o relógio. */
  dataEmissao: Date
}
