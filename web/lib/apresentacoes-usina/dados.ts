// web/lib/apresentacoes-usina/dados.ts
import type { ViabilidadeInput, ViabilidadeResultado } from '@/lib/simuladores/viabilidade/types'
import type { EmpresaProposta } from '@/lib/simuladores/proposta-empresa'
import type { ApresentacaoUsinaData } from './tipos'
import { custosProjeto } from './custos'
import { svgFluxoAcumulado } from './grafico'
import { corLegivelSobreClaro } from '@/lib/apresentacoes/contraste'

const COR_PADRAO = '#0a0e1a'
const VALIDADE_DIAS = 10

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v: number) => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
const num = (v: number, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

export type SnapshotUsina = {
  input: ViabilidadeInput
  resultado: ViabilidadeResultado
  empresa: EmpresaProposta
  clienteNome: string | null
  clienteCidade: string | null
  concessionariaNome: string
  modeloPainel: string
  modeloInversor: string
  config: { cor_principal: string; cor_secundaria: string }
}

export function montarApresentacaoUsina(s: SnapshotUsina): ApresentacaoUsinaData {
  const i = s.input
  const r = s.resultado
  const corPrincipal = s.config.cor_principal?.trim() || COR_PADRAO
  const geracaoMensal = r.geracaoAnualKwh / 12
  const potenciaNominal = i.numInversores * i.potenciaInversorKw
  const receitaBrutaMensal = r.projecao[1]?.receitaBruta ? r.projecao[1].receitaBruta / 12 : 0
  const financiado = i.pctFinanciado > 0

  return {
    titulo: 'Proposta de Investimento em Usina Solar',
    empresa: {
      nome: s.empresa.nome,
      cnpj: s.empresa.cnpj,
      telefone: s.empresa.telefone,
      email: s.empresa.email,
      logo_url: s.empresa.logoBase64,
    },
    cliente: { nome: s.clienteNome, cidade: s.clienteCidade },
    datas: {
      emitida_em: new Date().toLocaleDateString('pt-BR'),
      validade_dias: String(VALIDADE_DIAS),
    },
    tema: {
      cor_principal: corPrincipal,
      cor_texto: corLegivelSobreClaro(corPrincipal),
      cor_secundaria: s.config.cor_secundaria?.trim() || COR_PADRAO,
    },
    indicadores: {
      tir: pct(r.capitalProprio.tir),
      vpl: brl(r.capitalProprio.vpl),
      payback: `${r.capitalProprio.paybackAnos} anos`,
      potencia_kwp: `${num(r.kwp, 2)} kWp`,
      geracao_anual: `${num(r.geracaoAnualKwh)} kWh`,
    },
    usina: {
      modelo_compensacao: 'Compartilhada',
      regra_transicao: i.modalidade === 'GD1' ? 'GD 1' : 'GD 2',
      concessionaria: s.concessionariaNome,
      potencia_pico: `${num(r.kwp, 2)} kWp`,
      potencia_nominal: `${num(potenciaNominal)} kW`,
      painel: `${num(i.potenciaPainelWp)} Wp × ${i.numPaineis} un — ${s.modeloPainel}`,
      inversor: `${num(i.potenciaInversorKw)} kW × ${i.numInversores} un — ${s.modeloInversor}`,
      fator_capacidade: pct(i.fatorCapacidade),
      geracao_anual: `${num(r.geracaoAnualKwh)} kWh`,
      geracao_mensal: `${num(geracaoMensal)} kWh`,
      tipo_usina: r.tipoUsina,
    },
    premissas: [
      { rotulo: 'Desconto do consumidor', valor: pct(i.descontoLocacao) },
      { rotulo: 'Tarifa compensável (R$/kWh)', valor: num(i.tarifaLocacaoBase, 4) },
      { rotulo: 'Reajuste de energia / IPCA', valor: pct(i.reajusteTarifaAnual) },
      { rotulo: 'Fator de indisponibilidade', valor: pct(i.degradacaoAnual) },
      { rotulo: 'TMA', valor: pct(i.tma) },
      { rotulo: 'Percentual de imposto', valor: pct(i.impostoPct) },
      { rotulo: 'Receita bruta mensal prevista', valor: brl(receitaBrutaMensal) },
    ],
    custos: custosProjeto(i),
    financiamento: {
      resumo: financiado
        ? `${pct(i.pctFinanciado)} financiado`
        : 'Investimento 100% com recursos próprios',
      linhas: financiado
        ? [
            { rotulo: 'Porcentagem financiada', valor: pct(i.pctFinanciado) },
            { rotulo: 'Taxa de juros (anual)', valor: pct(i.jurosAnual) },
            { rotulo: 'Prazo (meses)', valor: String(i.prazoMeses) },
            { rotulo: 'Recursos financiados', valor: brl(i.valorInvestimento * i.pctFinanciado) },
            { rotulo: 'Recursos próprios', valor: brl(i.valorInvestimento * (1 - i.pctFinanciado)) },
          ]
        : [{ rotulo: 'Recursos próprios', valor: brl(i.valorInvestimento) }],
    },
    retorno: {
      cenarios: [
        { rotulo: 'TIR', proprio: pct(r.capitalProprio.tir), financiado: pct(r.comFinanciamento.tir) },
        { rotulo: 'VPL', proprio: brl(r.capitalProprio.vpl), financiado: brl(r.comFinanciamento.vpl) },
        { rotulo: 'Payback (anos)', proprio: String(r.capitalProprio.paybackAnos), financiado: String(r.comFinanciamento.paybackAnos) },
      ],
    },
    projecao: {
      svg: svgFluxoAcumulado(r.projecao.map((l) => ({ ano: l.ano, valor: l.fluxoProprioAcum }))),
      tabela: r.projecao.map((l) => ({
        ano: String(l.ano),
        producao: num(l.producaoKwh),
        receita: brl(l.receitaBruta),
        opex: brl(l.opex),
        fluxoProprio: brl(l.fluxoProprio),
        acumulado: brl(l.fluxoProprioAcum),
      })),
    },
  }
}
