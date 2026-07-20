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
    descricao: 'Apresentação completa, com indicadores em destaque.',
    temaPadrao: 'minimal-white',
    blocos: ['cover', 'resumo', 'sistema', 'equipamentos', 'condicoes', 'contato'],
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
