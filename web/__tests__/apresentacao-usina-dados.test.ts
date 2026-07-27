import { describe, it, expect } from 'vitest'
import { montarApresentacaoUsina } from '@/lib/apresentacoes-usina/dados'
import { montarViabilidadeInput, PREMISSAS_DEFAULT } from '@/lib/simuladores/viabilidade/montar-input'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import type { ConcessionariaBruta } from '@/lib/simuladores/viabilidade/concessionaria'

const RGE: ConcessionariaBruta = {
  nome: 'RGE', tipoProcesso: 'Reajuste 2025',
  tusd: 517.75, te: 304.45, tusdFioB: 303.53, tusdFioA: 64.47, tusdPeD: 4.7, tusdTfsee: 1.25,
  icms: 0.18, pisCofins: 0.05, demandaContratadaSemImp: 25.53, demandaGeracaoSemImp: 13.23,
  aplicaReajuste1430: true,
}
const campos = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2' as const, valorInvestimento: 154413.82,
  descontoLocacao: 0.2, pctFinanciado: 0, premissas: PREMISSAS_DEFAULT,
}
const empresa = { nome: 'Solar X', cnpj: '00.000.000/0001-00', endereco: null, telefone: '(63) 99999-9999', email: 'x@x.com', logoBase64: null }

function montar() {
  const input = montarViabilidadeInput(campos, RGE)
  const resultado = calcularViabilidade(input)
  const config = { cor_principal: '#0a0e1a', cor_secundaria: '#0a0e1a' }
  return montarApresentacaoUsina({
    input, resultado, empresa,
    clienteNome: 'Investidor Teste', clienteCidade: 'Palmas/TO',
    concessionariaNome: 'RGE', modeloPainel: 'Jinko S600', modeloInversor: 'Huawei A60',
    config,
  })
}

describe('montarApresentacaoUsina', () => {
  it('formata os indicadores do caso RGE', () => {
    const d = montar()
    expect(d.indicadores.potencia_kwp).toBe('90,00 kWp')
    expect(d.indicadores.geracao_anual).toBe('109.272 kWh')
    expect(d.indicadores.payback).toBe('5 anos')
    expect(d.indicadores.tir).toMatch(/^21,4/)
    expect(d.indicadores.vpl).toContain('226.6')
  })

  it('descreve a usina', () => {
    const d = montar()
    expect(d.usina.tipo_usina).toBe('Microusina')
    expect(d.usina.potencia_nominal).toBe('75 kW')
    expect(d.usina.painel).toContain('150')
    expect(d.usina.painel).toContain('Jinko S600')
  })

  it('financiamento 0% vira "100% recursos próprios"', () => {
    const d = montar()
    expect(d.financiamento.resumo).toContain('100%')
  })

  it('projeção tem uma linha por ano do horizonte + ano 0', () => {
    const d = montar()
    expect(d.projecao.tabela.length).toBe(26)
    expect(d.projecao.svg.startsWith('<svg')).toBe(true)
  })
})
