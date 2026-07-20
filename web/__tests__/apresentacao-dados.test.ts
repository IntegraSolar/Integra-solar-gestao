import { describe, it, expect } from 'vitest'
import { montarApresentacao, type ApresentacaoRaw } from '@/lib/apresentacoes/dados'

function raw(over: Partial<ApresentacaoRaw> = {}): ApresentacaoRaw {
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
      email: 'contato@integrasolar.com.br',
      cidade: 'Palmas',
      estado: 'TO',
      endereco: 'Rua das Flores',
      bairro: 'Centro',
      numero: '123',
      cor_principal: '#10B981',
      cor_secundaria: '#1A3A5C',
      logo_url: 'https://exemplo/logo.png',
    },
    depoimentos: [],
    ...over,
  }
}

describe('montarApresentacao', () => {
  it('mantém o comportamento da proposta pública para os campos comuns', () => {
    const a = montarApresentacao(raw())
    expect(a.empresa.nome).toBe('Integra Solar')
    expect(a.cliente.nome).toBe('Marcílio')
    expect(a.sistema.potencia_kwp).toBe('8,68 kWp')
    expect(a.investimento.valor).toMatch(/^R\$\s*22\.000,00$/)
    expect(a.datas.emitida_em).toBe('20/07/2026')
    expect(a.datas.valida_ate).toBe('04/08/2026')
  })

  it('separa os equipamentos em marca, quantidade e potência', () => {
    const e = montarApresentacao(raw()).equipamentos
    expect(e.paineis).toEqual({ marca: 'Osda MHDRZ', quantidade: '14', potencia: '620 W' })
    expect(e.inversores).toEqual({ marca: 'Deye SUN8k', quantidade: '1', potencia: '8 kW' })
  })

  it('usa rótulo genérico quando a marca não foi informada', () => {
    const r = raw()
    r.proposta.panel_brand_model = null
    r.proposta.inverter_brand_model = '   '
    const e = montarApresentacao(r).equipamentos
    expect(e.paineis.marca).toBe('Painéis solares')
    expect(e.inversores.marca).toBe('Inversor')
  })

  it('expõe e-mail e cidade da empresa para o bloco de contato', () => {
    const a = montarApresentacao(raw())
    expect(a.empresa.email).toBe('contato@integrasolar.com.br')
    expect(a.empresa.cidade).toBe('Palmas')
  })

  it('tolera empresa sem e-mail e sem cidade', () => {
    const r = raw()
    r.org.email = null
    r.org.cidade = null
    const a = montarApresentacao(r)
    expect(a.empresa.email).toBeNull()
    expect(a.empresa.cidade).toBeNull()
  })

  it('cai nas cores padrão quando a empresa não configurou', () => {
    const r = raw()
    r.org.cor_principal = null
    r.org.cor_secundaria = null
    const t = montarApresentacao(r).tema
    expect(t.cor_principal).toBe('#10B981')
    expect(t.cor_secundaria).toBe('#1A3A5C')
  })

  it('não expõe nenhum campo de custo interno', () => {
    const a = montarApresentacao(raw())
    const serializado = JSON.stringify(a)
    for (const proibido of ['custo', 'margem', 'comissao', 'imposto', 'preco_calculado', 'ajuste']) {
      expect(serializado.toLowerCase()).not.toContain(proibido)
    }
  })
})

describe('montarApresentacao — dados incompletos não podem virar informação errada', () => {
  it('sem preço, o investimento fica nulo em vez de R$ 0,00', () => {
    const r = raw()
    r.proposta.preco_final = 0
    expect(montarApresentacao(r).investimento.valor).toBeNull()
  })

  it('potência de inversor inválida não vira "0 kW"', () => {
    const r = raw()
    // 22 propostas antigas gravaram kW num campo que o sistema trata como W.
    // Dividir por 1000 produziria "0 kW" na frente do cliente final.
    r.proposta.inverter_power_w = 8
    const a = montarApresentacao(r)
    expect(a.equipamentos.inversores.potencia).toBeNull()
    expect(a.sistema.inversores).toBe('1x Deye SUN8k')
  })

  it('potência válida em watts continua sendo convertida', () => {
    const a = montarApresentacao(raw())
    expect(a.equipamentos.inversores.potencia).toBe('8 kW')
  })
})

describe('montarApresentacao — bloco institucional (empresa)', () => {
  it('monta o endereço resumido com todas as partes', () => {
    const a = montarApresentacao(raw())
    expect(a.empresa.endereco_resumido).toBe('Rua das Flores, 123 — Centro, Palmas/TO')
  })

  it('endereço sem bairro e sem número não gera vírgulas soltas nem traços órfãos', () => {
    const r = raw()
    r.org.bairro = null
    r.org.numero = null
    const a = montarApresentacao(r)
    expect(a.empresa.endereco_resumido).toBe('Rua das Flores — Palmas/TO')
  })

  it('sem nenhuma parte de endereço, endereco_resumido é null', () => {
    const r = raw()
    r.org.endereco = null
    r.org.numero = null
    r.org.bairro = null
    r.org.cidade = null
    r.org.estado = null
    const a = montarApresentacao(r)
    expect(a.empresa.endereco_resumido).toBeNull()
  })

  it('expõe razão social no bloco de empresa', () => {
    const a = montarApresentacao(raw())
    expect(a.empresa.razao_social).toBe('Integra Solar LTDA')
  })
})

describe('montarApresentacao — depoimentos', () => {
  it('fica vazio quando a origem não traz nenhum', () => {
    const a = montarApresentacao(raw())
    expect(a.depoimentos).toEqual([])
  })

  it('repassa os depoimentos informados', () => {
    const r = raw({
      depoimentos: [{ autor: 'João', cidade: 'Palmas', texto: 'Excelente serviço' }],
    })
    const a = montarApresentacao(r)
    expect(a.depoimentos).toEqual([{ autor: 'João', cidade: 'Palmas', texto: 'Excelente serviço' }])
  })
})
