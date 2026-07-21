// web/lib/apresentacoes/textos.ts
//
// Textos configuráveis dos blocos de Apresentação Comercial. Antes viviam
// embutidos em cada bloco (Garantias, LinhaDoTempo, ComoFunciona,
// FluxoInstalacao); agora cada empresa cliente pode personalizá-los via
// coluna jsonb, com fallback individual por chave para o texto padrão.
import type { NomeIcone } from '@/components/apresentacao/primitivos/Icone'

export type ItemGarantia = { titulo: string; prazo: string; descricao: string; icone: NomeIcone }
export type ItemEtapa = { titulo: string; descricao: string }
export type ItemPasso = { titulo: string; descricao: string; icone: NomeIcone }

export type TextosApresentacao = {
  garantias: ItemGarantia[]
  timeline: ItemEtapa[]
  como_funciona: ItemPasso[]
  fluxo: ItemPasso[]
  abertura: string | null
  encerramento: string | null
}

const ICONES_VALIDOS: readonly NomeIcone[] = [
  'sol',
  'raio',
  'bateria',
  'ferramenta',
  'escudo',
  'relogio',
  'check',
  'casa',
  'grafico',
  'documento',
  'telefone',
  'email',
  'local',
  'calendario',
]

function ehIconeValido(v: unknown): v is NomeIcone {
  return typeof v === 'string' && (ICONES_VALIDOS as readonly string[]).includes(v)
}

export const TEXTOS_PADRAO: TextosApresentacao = {
  garantias: [
    { icone: 'sol', titulo: 'Painéis', prazo: '25 anos', descricao: 'Garantia de performance' },
    { icone: 'raio', titulo: 'Inversor', prazo: '10 anos', descricao: 'Garantia do fabricante' },
    { icone: 'ferramenta', titulo: 'Instalação', prazo: '1 ano', descricao: 'Serviço e mão de obra' },
  ],
  timeline: [
    {
      titulo: 'Dimensionamento',
      descricao: 'Analisamos seu consumo e definimos o tamanho ideal do sistema.',
    },
    {
      titulo: 'Projeto',
      descricao: 'Elaboramos o projeto técnico conforme as normas da concessionária.',
    },
    {
      titulo: 'Homologação',
      descricao: 'Enviamos a documentação e aguardamos a aprovação da distribuidora.',
    },
    {
      titulo: 'Instalação',
      descricao: 'Nossa equipe instala estruturas, módulos e inversor no seu telhado.',
    },
    {
      titulo: 'Comissionamento',
      descricao: 'Testamos o sistema e solicitamos a vistoria final para ligação.',
    },
    {
      titulo: 'Monitoramento',
      descricao: 'Você acompanha a geração de energia em tempo real pelo aplicativo.',
    },
  ],
  como_funciona: [
    { icone: 'sol', titulo: 'Passo 1', descricao: 'Os painéis captam a luz do sol.' },
    {
      icone: 'raio',
      titulo: 'Passo 2',
      descricao: 'O inversor transforma essa energia em eletricidade para sua casa.',
    },
    { icone: 'grafico', titulo: 'Passo 3', descricao: 'O que sobra vira crédito na conta de luz.' },
    {
      icone: 'telefone',
      titulo: 'Passo 4',
      descricao: 'Você acompanha tudo pelo aplicativo, a qualquer hora.',
    },
  ],
  fluxo: [
    { icone: 'local', titulo: 'Passo 1', descricao: 'Visita técnica' },
    { icone: 'ferramenta', titulo: 'Passo 2', descricao: 'Montagem das estruturas' },
    { icone: 'sol', titulo: 'Passo 3', descricao: 'Instalação dos módulos' },
    { icone: 'raio', titulo: 'Passo 4', descricao: 'Conexão e testes' },
  ],
  abertura: null,
  encerramento: null,
}

function textoValido(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function normalizarLista<T extends Record<string, unknown>>(
  bruto: unknown,
  padrao: T[],
  camposObrigatorios: (keyof T)[],
  temIcone: boolean,
  iconeChavePadrao: NomeIcone
): T[] {
  if (!Array.isArray(bruto) || bruto.length === 0) return padrao

  const itens: T[] = []
  for (const item of bruto) {
    if (typeof item !== 'object' || item === null) return padrao

    const registro = item as Record<string, unknown>
    const camposOk = camposObrigatorios.every((campo) => textoValido(registro[campo as string]))
    if (!camposOk) return padrao

    const resultado: Record<string, unknown> = { ...registro }
    if (temIcone) {
      resultado.icone = ehIconeValido(registro.icone) ? registro.icone : iconeChavePadrao
    }
    itens.push(resultado as T)
  }

  return itens
}

function normalizarFrase(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const limpa = v.trim()
  return limpa.length > 0 ? limpa : null
}

export function mesclarTextos(bruto: unknown): TextosApresentacao {
  try {
    const obj = typeof bruto === 'object' && bruto !== null && !Array.isArray(bruto)
      ? (bruto as Record<string, unknown>)
      : {}

    return {
      garantias: normalizarLista<ItemGarantia>(
        obj.garantias,
        TEXTOS_PADRAO.garantias,
        ['titulo', 'prazo', 'descricao'],
        true,
        'sol'
      ),
      timeline: normalizarLista<ItemEtapa>(
        obj.timeline,
        TEXTOS_PADRAO.timeline,
        ['titulo', 'descricao'],
        false,
        'sol'
      ),
      como_funciona: normalizarLista<ItemPasso>(
        obj.como_funciona,
        TEXTOS_PADRAO.como_funciona,
        ['titulo', 'descricao'],
        true,
        'sol'
      ),
      fluxo: normalizarLista<ItemPasso>(
        obj.fluxo,
        TEXTOS_PADRAO.fluxo,
        ['titulo', 'descricao'],
        true,
        'sol'
      ),
      abertura: normalizarFrase(obj.abertura),
      encerramento: normalizarFrase(obj.encerramento),
    }
  } catch {
    return TEXTOS_PADRAO
  }
}
