// web/lib/apresentacoes-usina/tipos.ts
// Dado exibido na proposta de usina. Tudo já em string formatada pt-BR — a
// página pública não formata nem calcula; só desenha.

export type LinhaProjecaoView = {
  ano: string
  producao: string
  tarifa: string
  receita: string
  prestacao: string
  opex: string
  imposto: string
  fluxoProprio: string
  acumuladoProprio: string
  fluxoFinanciado: string
  acumuladoFinanciado: string
}

export type ApresentacaoUsinaData = {
  titulo: string
  empresa: {
    nome: string
    cnpj: string | null
    telefone: string | null
    email: string | null
    logo_url: string | null
  }
  cliente: { nome: string | null; cidade: string | null }
  datas: { emitida_em: string; validade_dias: string }
  tema: { cor_principal: string; cor_texto: string; cor_secundaria: string }

  indicadores: {
    tir: string
    vpl: string
    payback: string
    potencia_kwp: string
    geracao_anual: string
  }
  usina: {
    modelo_compensacao: string
    regra_transicao: string
    concessionaria: string
    potencia_pico: string
    potencia_nominal: string
    painel: string
    inversor: string
    fator_capacidade: string
    geracao_anual: string
    geracao_mensal: string
    tipo_usina: string
  }
  premissas: { rotulo: string; valor: string }[]
  custos: { rotulo: string; valor: string }[]
  financiamento: {
    resumo: string
    linhas: { rotulo: string; valor: string }[]
  }
  retorno: {
    cenarios: { rotulo: string; proprio: string; financiado: string }[]
  }
  projecao: {
    svg: string
    tabela: LinhaProjecaoView[]
  }
}
