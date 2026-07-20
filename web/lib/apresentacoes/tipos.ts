// web/lib/apresentacoes/tipos.ts

/** Blocos disponíveis na Fase 1. Novos blocos entram aqui primeiro. */
export const BLOCOS_VALIDOS = [
  'cover',
  'resumo',
  'sistema',
  'equipamentos',
  'condicoes',
  'contato',
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
    cnpj: string | null
    telefone: string | null
    email: string | null
    cidade: string | null
    logo_url: string | null
  }
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
}

export function ehBlocoValido(v: unknown): v is BlocoId {
  return typeof v === 'string' && (BLOCOS_VALIDOS as readonly string[]).includes(v)
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
