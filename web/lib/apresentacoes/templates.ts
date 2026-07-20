// web/lib/apresentacoes/templates.ts
import { BLOCOS_VALIDOS, ehBlocoValido, type BlocoId, type ApresentacaoConfig } from './tipos'
import { temaValido, TEMA_PADRAO } from './temas'

export type Template = {
  id: string
  nome: string
  descricao: string
  temaPadrao: string
  blocos: BlocoId[]
}

export const TEMPLATES: Record<string, Template> = {
  premium: {
    id: 'premium',
    nome: 'Premium',
    descricao: 'Apresentação completa, com todos os diferenciais.',
    temaPadrao: 'minimal-white',
    blocos: [
      // Sem 'resumo': o Hero logo acima ja exibe potencia, geracao e investimento.
      'cover', 'hero', 'sistema', 'equipamentos', 'garantias',
      'como-funciona', 'timeline', 'condicoes', 'empresa', 'assinatura', 'contato',
    ],
  },
  minimalista: {
    id: 'minimalista',
    nome: 'Minimalista',
    descricao: 'Só o essencial, direto ao ponto.',
    temaPadrao: 'minimal-white',
    blocos: ['cover', 'resumo', 'sistema', 'condicoes', 'contato'],
  },
  corporativo: {
    id: 'corporativo',
    nome: 'Corporativo',
    descricao: 'Formal, para empresas e licitações.',
    temaPadrao: 'corporate-blue',
    blocos: ['cover', 'resumo', 'sistema', 'equipamentos', 'garantias', 'empresa', 'condicoes', 'assinatura', 'contato'],
  },
  industrial: {
    id: 'industrial',
    nome: 'Industrial',
    descricao: 'Foco técnico, para grandes instalações.',
    temaPadrao: 'executive-black',
    blocos: ['cover', 'resumo', 'sistema', 'equipamentos', 'fluxo', 'timeline', 'garantias', 'condicoes', 'contato'],
  },
  residencial: {
    id: 'residencial',
    nome: 'Residencial',
    descricao: 'Didático, para o cliente final.',
    temaPadrao: 'green-energy',
    blocos: ['cover', 'hero', 'como-funciona', 'sistema', 'garantias', 'timeline', 'condicoes', 'contato'],
  },
  agronegocio: {
    id: 'agronegocio',
    nome: 'Agronegócio',
    descricao: 'Para propriedades rurais e irrigação.',
    temaPadrao: 'solar-gold',
    blocos: ['cover', 'hero', 'sistema', 'equipamentos', 'fluxo', 'garantias', 'empresa', 'condicoes', 'contato'],
  },
  luxury: {
    id: 'luxury',
    nome: 'Luxury',
    descricao: 'Sofisticado, para alto padrão.',
    temaPadrao: 'executive-black',
    blocos: ['cover', 'hero', 'sistema', 'garantias', 'empresa', 'depoimentos', 'condicoes', 'assinatura', 'contato'],
  },
  executive: {
    id: 'executive',
    nome: 'Executive',
    descricao: 'Objetivo, para decisor com pouco tempo.',
    temaPadrao: 'executive-black',
    blocos: ['cover', 'resumo', 'sistema', 'condicoes', 'assinatura', 'contato'],
  },
  dark: {
    id: 'dark',
    nome: 'Dark',
    descricao: 'Visual escuro e moderno.',
    temaPadrao: 'modern-dark',
    blocos: ['cover', 'hero', 'sistema', 'equipamentos', 'garantias', 'timeline', 'condicoes', 'contato'],
  },
  modern: {
    id: 'modern',
    nome: 'Modern',
    descricao: 'Contemporâneo, com bastante respiro.',
    temaPadrao: 'minimal-white',
    blocos: ['cover', 'hero', 'como-funciona', 'sistema', 'garantias', 'empresa', 'condicoes', 'contato'],
  },
}

export const TEMPLATE_PADRAO = 'premium'

export function templateValido(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEMPLATES, id)
}

export function blocosDoTemplate(id: string): BlocoId[] {
  return TEMPLATES[id]?.blocos ?? [...BLOCOS_VALIDOS]
}

/**
 * Sanitiza a configuração vinda do banco.
 *
 * O campo `blocos` é jsonb livre: pode conter bloco removido numa versão
 * anterior, ou valor inválido. Renderizar isso quebraria a página do cliente
 * final, então tudo que não é reconhecido é descartado.
 *
 * Fica neste módulo (em vez de `tipos.ts`) porque precisa de `temaValido`/
 * `TEMA_PADRAO` (de `./temas`) e de `templateValido`/`TEMPLATE_PADRAO`/
 * `blocosDoTemplate` (definidos acima, neste arquivo) via imports estáticos
 * normais, sem recorrer a `require()` para evitar ciclo de imports.
 */
export function normalizarConfig(
  bruta: { template?: unknown; tema?: unknown; blocos?: unknown } | null
): ApresentacaoConfig {
  const template =
    typeof bruta?.template === 'string' && templateValido(bruta.template)
      ? bruta.template
      : TEMPLATE_PADRAO

  const tema =
    typeof bruta?.tema === 'string' && temaValido(bruta.tema) ? bruta.tema : TEMA_PADRAO

  const brutos = Array.isArray(bruta?.blocos) ? bruta!.blocos : []
  const blocos = brutos.filter(ehBlocoValido)

  return {
    template,
    tema,
    blocos: blocos.length > 0 ? blocos : blocosDoTemplate(template),
  }
}
