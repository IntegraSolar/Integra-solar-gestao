// web/lib/apresentacoes/tipos.ts
import type { TextosApresentacao } from './textos'

/** Blocos disponíveis na Fase 1. Novos blocos entram aqui primeiro. */
export const BLOCOS_VALIDOS = [
  'cover',
  'resumo',
  'sistema',
  'equipamentos',
  'condicoes',
  'contato',
  'hero',
  'garantias',
  'timeline',
  'fluxo',
  'como-funciona',
  'assinatura',
  'empresa',
  'depoimentos',
] as const

export type BlocoId = (typeof BLOCOS_VALIDOS)[number]

export type ApresentacaoConfig = {
  template: string
  tema: string
  blocos: BlocoId[]
}

/** Dado exibido na apresentação. Tudo já formatado para leitura. */
export type ApresentacaoData = {
  titulo: string
  empresa: {
    nome: string
    razao_social: string | null
    cnpj: string | null
    telefone: string | null
    email: string | null
    cidade: string | null
    logo_url: string | null
    endereco_resumido: string | null
  }
  depoimentos: { autor: string; cidade: string | null; texto: string }[]
  cliente: { nome: string; cidade: string | null }
  sistema: {
    paineis: string
    inversores: string
    potencia_kwp: string
    geracao_mensal: string
  }
  equipamentos: {
    paineis: { marca: string; quantidade: string; potencia: string | null }
    inversores: { marca: string; quantidade: string; potencia: string | null }
  }
  /** null quando a proposta ainda não teve o orçamento gerado. */
  investimento: { valor: string | null }
  datas: { emitida_em: string; valida_ate: string }
  tema: { cor_principal: string; cor_texto: string; cor_secundaria: string }
  textos: TextosApresentacao
}

export function ehBlocoValido(v: unknown): v is BlocoId {
  return typeof v === 'string' && (BLOCOS_VALIDOS as readonly string[]).includes(v)
}

/** Rótulo amigável de cada bloco, usado na UI de configuração da apresentação. */
export const ROTULOS_BLOCO: Record<BlocoId, string> = {
  cover: 'Capa',
  hero: 'Destaque',
  resumo: 'Resumo',
  sistema: 'Sistema',
  equipamentos: 'Equipamentos',
  garantias: 'Garantias',
  'como-funciona': 'Como Funciona',
  fluxo: 'Fluxo da Instalação',
  timeline: 'Linha do Tempo',
  empresa: 'Empresa',
  depoimentos: 'Depoimentos',
  condicoes: 'Condições Comerciais',
  assinatura: 'Assinatura',
  contato: 'Contato',
}

// `normalizarConfig` vive em `./templates.ts`: ele precisa de `temaValido`/`TEMA_PADRAO`
// (de `./temas.ts`) e de `templateValido`/`TEMPLATE_PADRAO`/`blocosDoTemplate` (do próprio
// `./templates.ts`). Colocar a função aqui exigiria `require()` em runtime para evitar um
// ciclo de imports estáticos entre os três módulos. Em vez disso, a função mora onde as
// dependências já são satisfeitas por imports estáticos normais, e é reexportada aqui para
// manter `normalizarConfig` acessível a partir de `@/lib/apresentacoes/tipos`. Como este
// módulo (`tipos.ts`) só é referenciado por `templates.ts` para tipos (apagados em tempo de
// compilação), não há ciclo real em tempo de execução.
export { normalizarConfig } from './templates'
