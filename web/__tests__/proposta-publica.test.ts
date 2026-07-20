import { describe, it, expect } from 'vitest'
import { montarPropostaPublica, type PropostaRaw } from '@/lib/proposals/proposta-publica'

function raw(over: Partial<PropostaRaw> = {}): PropostaRaw {
  return {
    proposta: {
      name: 'Proposta Residencial',
      panel_qty: 14,
      panel_power_w: 620,
      panel_brand_model: 'Osda MHDRZ',
      inverter_qty: 1,
      inverter_power_w: 8000,
      inverter_brand_model: 'Deye SUN8k',
      total_power_kwp: 8.68,
      monthly_generation_kwh: 1050,
      preco_final: 22000,
      gerado_em: '2026-07-20T12:00:00Z',
    },
    lead: { name: 'Marcílio', city: 'Palmas', phone: '63999998888' },
    org: {
      nome_fantasia: 'Integra Solar',
      razao_social: 'Integra Solar LTDA',
      cnpj: '12345678000199',
      telefone: '6332221111',
      cor_principal: '#10B981',
      cor_secundaria: '#1A3A5C',
      logo_url: 'https://exemplo/logo.png',
    },
    ...over,
  }
}

describe('montarPropostaPublica', () => {
  it('usa o nome fantasia da empresa quando existe', () => {
    expect(montarPropostaPublica(raw()).empresa.nome).toBe('Integra Solar')
  })

  it('cai para a razão social quando não há nome fantasia', () => {
    const r = raw()
    r.org.nome_fantasia = null
    expect(montarPropostaPublica(r).empresa.nome).toBe('Integra Solar LTDA')
  })

  it('formata o investimento em reais', () => {
    // formatCurrency usa Intl, que separa "R$" do número com espaço não-quebrável
    // (U+00A0). Comparar com espaço comum falha com mensagem visualmente idêntica.
    expect(montarPropostaPublica(raw()).investimento.valor).toMatch(/^R\$\s*22\.000,00$/)
  })

  it('descreve os painéis com quantidade, potência e marca', () => {
    expect(montarPropostaPublica(raw()).sistema.paineis).toBe('14x Osda MHDRZ — 620 W')
  })

  it('descreve o inversor convertendo W para kW', () => {
    expect(montarPropostaPublica(raw()).sistema.inversores).toBe('1x Deye SUN8k — 8 kW')
  })

  it('omite a marca quando não informada', () => {
    const r = raw()
    r.proposta.panel_brand_model = null
    expect(montarPropostaPublica(r).sistema.paineis).toBe('14x painéis — 620 W')
  })

  it('mostra potência total e geração estimada', () => {
    const s = montarPropostaPublica(raw()).sistema
    expect(s.potencia_kwp).toBe('8,68 kWp')
    expect(s.geracao_mensal).toBe('1.050 kWh/mês')
  })

  it('calcula validade de 15 dias a partir da geração', () => {
    const p = montarPropostaPublica(raw())
    expect(p.datas.emitida_em).toBe('20/07/2026')
    expect(p.datas.valida_ate).toBe('04/08/2026')
  })

  it('usa as cores da empresa e cai no padrão quando ausentes', () => {
    expect(montarPropostaPublica(raw()).tema.cor_principal).toBe('#10B981')
    const r = raw()
    r.org.cor_principal = null
    expect(montarPropostaPublica(r).tema.cor_principal).toBe('#10B981')
  })
})
