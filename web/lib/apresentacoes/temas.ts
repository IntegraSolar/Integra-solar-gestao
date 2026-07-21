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
  'corporate-blue': {
    id: 'corporate-blue',
    nome: 'Corporate Blue',
    corDestaque: '#2563EB',
    escuro: false,
  },
  'modern-dark': {
    id: 'modern-dark',
    nome: 'Modern Dark',
    corDestaque: '#8B5CF6',
    escuro: true,
  },
  'solar-gold': {
    id: 'solar-gold',
    nome: 'Solar Gold',
    corDestaque: '#B45309',
    escuro: false,
  },
  'green-energy': {
    id: 'green-energy',
    nome: 'Green Energy',
    corDestaque: '#047857',
    escuro: false,
  },
}

export const TEMA_PADRAO = 'minimal-white'

export function temaValido(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TEMAS, id)
}
