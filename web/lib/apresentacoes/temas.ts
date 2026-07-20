// web/lib/apresentacoes/temas.ts

export type Tema = {
  id: string
  nome: string
  /** Cor usada na pré-visualização do tema na UI de seleção. */
  corDestaque: string
  /** true quando o tema é escuro — usado para escolher variantes de logo/ícone. */
  escuro: boolean
}

export const TEMAS: Record<string, Tema> = {
  'minimal-white': {
    id: 'minimal-white',
    nome: 'Minimal White',
    corDestaque: '#10B981',
    escuro: false,
  },
  'executive-black': {
    id: 'executive-black',
    nome: 'Executive Black',
    corDestaque: '#D4A017',
    escuro: true,
  },
}

export const TEMA_PADRAO = 'minimal-white'

export function temaValido(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEMAS, id)
}
