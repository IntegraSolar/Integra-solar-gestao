import { describe, it, expect } from 'vitest'
import { calcularCapex } from '@/lib/simuladores/hibrido/capex'
import { PRECOS_CAPEX_PADRAO, PREMISSAS_FINANCEIRAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import { FISICO } from './fixtures/hibrido-fixture'

const base = { fisico: FISICO, precos: PRECOS_CAPEX_PADRAO, premissas: PREMISSAS_FINANCEIRAS_PADRAO }

describe('calcularCapex (golden da planilha)', () => {
  const r = calcularCapex(base)

  it('tem os 8 itens na ordem da planilha', () => {
    expect(r.itens.map((i) => i.descricao)).toEqual([
      'Módulos fotovoltaicos',
      'Inversor / híbrido',
      'Banco de baterias',
      'Estrutura de fixação',
      'Cabeamento, conectores e proteções',
      'Projeto, ART e homologação',
      'Mão de obra / instalação',
      'Frete, deslocamento e imprevistos',
    ])
  })
  it('subtotais de cada item', () => {
    const sub = (d: string) => r.itens.find((i) => i.descricao === d)!.subtotal
    expect(sub('Módulos fotovoltaicos')).toBeCloseTo(12480, 6)
    expect(sub('Inversor / híbrido')).toBeCloseTo(11000, 6)
    expect(sub('Banco de baterias')).toBeCloseTo(19600, 6)
    expect(sub('Estrutura de fixação')).toBeCloseTo(2880, 6)
    expect(sub('Cabeamento, conectores e proteções')).toBeCloseTo(3968, 6)
    expect(sub('Projeto, ART e homologação')).toBeCloseTo(2500, 6)
    expect(sub('Mão de obra / instalação')).toBeCloseTo(2480, 6)
    expect(sub('Frete, deslocamento e imprevistos')).toBeCloseTo(2800, 6)
  })
  it('custo direto, BDI e custo com BDI', () => {
    expect(r.custoDireto).toBeCloseTo(57708, 6)
    expect(r.valorBdi).toBeCloseTo(8656.2, 6)
    expect(r.custoComBdi).toBeCloseTo(66364.2, 6)
  })
  it('investimento total com gross-up de margem e impostos', () => {
    expect(r.investimentoTotal).toBeCloseTo(89681.35135135135, 6)
    expect(r.valorMargem).toBeCloseTo(17936.27027027027, 6)
    expect(r.valorImpostos).toBeCloseTo(5380.881081081081, 6)
  })
  it('investimento específico por kWp', () => {
    expect(r.investimentoPorKwp).toBeCloseTo(9040.458805579772, 6)
  })
  it('margem + impostos somam o investimento menos o custo com BDI', () => {
    expect(r.valorMargem + r.valorImpostos + r.custoComBdi).toBeCloseTo(r.investimentoTotal, 6)
  })
})

describe('bordas', () => {
  it('margem + impostos >= 100% cai para o custo com BDI (guarda da planilha)', () => {
    const r = calcularCapex({ ...base, premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, margemLucro: 0.7, impostos: 0.3 } })
    expect(r.investimentoTotal).toBeCloseTo(r.custoComBdi, 6)
  })
  it('potência instalada zero não gera divisão por zero', () => {
    const r = calcularCapex({ ...base, fisico: { ...FISICO, potenciaInstaladaKwp: 0 } })
    expect(r.investimentoPorKwp).toBe(0)
  })
  it('sem equipamentos, restam só os itens de valor fixo', () => {
    const r = calcularCapex({
      ...base,
      fisico: { numModulos: 0, numInversores: 0, numBaterias: 0, potenciaInstaladaKwp: 0, producaoAnualKwh: 0, consumoAnualKwh: 0 },
    })
    expect(r.custoDireto).toBeCloseTo(2500 + 2800, 6)
    expect(Number.isNaN(r.investimentoTotal)).toBe(false)
  })
  it('BDI zero mantém o custo direto', () => {
    const r = calcularCapex({ ...base, premissas: { ...PREMISSAS_FINANCEIRAS_PADRAO, bdi: 0 } })
    expect(r.valorBdi).toBe(0)
    expect(r.custoComBdi).toBeCloseTo(r.custoDireto, 6)
  })
})
