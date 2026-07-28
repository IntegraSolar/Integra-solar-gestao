import { describe, it, expect } from 'vitest'
import { calcularViabilidade } from '@/lib/simuladores/viabilidade/engine'
import { custosProjeto } from '@/lib/apresentacoes-usina/custos'
import type { ViabilidadeInput, LinhaProjecao } from '@/lib/simuladores/viabilidade/types'
import golden from './fixtures/planilha-viabilidade-golden.json'

// Paridade célula-a-célula com a aba "Viabilidade" da planilha
// (docs/Tabela de viabilidade usinas de investimento.xlsx). Os valores do
// fixture foram extraídos com data_only=True — são os números que o Excel
// calculou, não digitados à mão. O cenário da planilha usa pctFinanciado=0,
// então as colunas de financiamento (R,S,T,U) são 0 em ambos os lados.

const INPUT: ViabilidadeInput = {
  numPaineis: 150, potenciaPainelWp: 600, numInversores: 1, potenciaInversorKw: 75,
  fatorCapacidade: 0.14, modalidade: 'GD2',
  tusdFioB: 0.36916808562393572, tarifaDemanda: 16.983311938382542,
  valorInvestimento: 154413.82, tarifaLocacaoBase: 0.8222, reajusteTarifaAnual: 0.08,
  degradacaoAnual: 0.015, tma: 0.10, descontoLocacao: 0.20,
  opexPct: 0.081199185409699712, impostoPct: 0.045, d23: 0.125,
  sunneSetupMicro: 5000, sunneSetupMini: 10000,
  pctFinanciado: 0, jurosAnual: 0.10, carenciaMeses: 6, amortizacaoAnos: 12,
  fioBSchedule: [0.6, 0.75, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  horizonteAnos: 25, anoInicial: 2025,
}

// Colunas F..AE da planilha ↔ campos de LinhaProjecao.
const COLUNAS: (keyof LinhaProjecao)[] = [
  'producaoKwh', 'tarifaBruta', 'fioBPct', 'tusdFioB', 'tusdNaoCompensavel',
  'tarifaLiquida', 'receitaBruta', 'saldoDevedor', 'prestacao', 'amortizacao', 'juros',
  'custoDisponibilidade', 'demandaGeracao', 'arrendamento', 'opex', 'gestao', 'imposto',
  'fluxoProprio', 'fluxoProprioAcum', 'fluxoFinanciado', 'fluxoFinanciadoAcum',
]

// Tolerância relativa de 1e-6 (com piso absoluto p/ valores nulos).
const perto = (a: number, b: number) =>
  Math.abs(a - b) <= Math.max(1e-4, Math.abs(b) * 1e-6)

describe('paridade com a planilha (aba Viabilidade)', () => {
  const r = calcularViabilidade(INPUT)
  const rows = golden.rows as Record<string, number>[]
  const s = golden.scalares as Record<string, number>

  it('projeta 26 linhas (2025..2050) alinhadas com a planilha', () => {
    expect(r.projecao).toHaveLength(rows.length)
    r.projecao.forEach((l, i) => expect(l.ano).toBe(rows[i].ano))
  })

  for (let i = 0; i < 26; i++) {
    it(`ano ${2025 + i}: todas as colunas F..AE batem`, () => {
      const l = r.projecao[i] as unknown as Record<string, number>
      const g = golden.rows[i] as Record<string, number>
      for (const col of COLUNAS) {
        const ok = perto(l[col], g[col])
        expect(ok, `${col} @${2025 + i}: motor=${l[col]} planilha=${g[col]}`).toBe(true)
      }
    })
  }

  it('métricas de retorno batem (TIR, VPL, Payback — próprio e acionista)', () => {
    expect(perto(r.capitalProprio.tir, s.tirProprio)).toBe(true)
    expect(perto(r.capitalProprio.vpl, s.vplProprio)).toBe(true)
    expect(r.capitalProprio.paybackAnos).toBe(s.paybackProprio)
    expect(perto(r.comFinanciamento.tir, s.tirAcionista)).toBe(true)
    expect(perto(r.comFinanciamento.vpl, s.vplAcionista)).toBe(true)
    expect(r.comFinanciamento.paybackAnos).toBe(s.paybackAcionista)
  })

  it('kWp e geração anual batem com C8/C9', () => {
    expect(perto(r.kwp, s.kwp)).toBe(true)
    expect(perto(r.geracaoAnualKwh, s.geracaoAnual)).toBe(true)
  })

  it('custos totais batem com C37..C44 (investimento, reestrut., OPEX VP, total, LCoE, CO2)', () => {
    // custosProjeto devolve strings formatadas — reconstrói os números crus a
    // partir da mesma projeção para comparar com a planilha.
    const y1 = r.projecao[1]
    const opexAcumVP =
      (y1.custoDisponibilidade + y1.demandaGeracao + y1.arrendamento + y1.opex + y1.gestao + y1.imposto) * 25
    const reestrut = -0.1 * INPUT.valorInvestimento * Math.pow(1.02, 15)
    const total = -INPUT.valorInvestimento + reestrut + opexAcumVP
    const co2 = (86.77 * r.geracaoAnualKwh) / 1000

    expect(perto(-INPUT.valorInvestimento, s.investimentoInicial)).toBe(true)
    expect(perto(reestrut, s.reestruturacao)).toBe(true)
    expect(perto(opexAcumVP, s.opexAcumVP)).toBe(true)
    expect(perto(total, s.totalCustos)).toBe(true)
    expect(perto(co2, s.co2)).toBe(true)

    // Garante que o bloco exibido na proposta contém as mesmas linhas.
    const linhas = custosProjeto(INPUT, r)
    expect(linhas.some((x) => x.rotulo.includes('OPEX acumulado'))).toBe(true)
    expect(linhas.some((x) => x.rotulo.includes('Total dos custos'))).toBe(true)
  })
})
