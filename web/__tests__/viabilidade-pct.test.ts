import { describe, it, expect } from 'vitest'
import { fracToPct, pctToFrac } from '@/lib/simuladores/viabilidade/pct'
import { PREMISSAS_DEFAULT } from '@/lib/simuladores/viabilidade/montar-input'

describe('fracToPct', () => {
  it('converte fração para porcentagem sem ruído de ponto flutuante', () => {
    expect(fracToPct(0.08)).toBe('8')
    expect(fracToPct(0.2)).toBe('20')
    expect(fracToPct(0.045)).toBe('4.5')
    expect(fracToPct(0.125)).toBe('12.5')
    expect(fracToPct(0.015)).toBe('1.5')
    expect(fracToPct(0)).toBe('0')
  })

  it('não emite valor para número inválido', () => {
    expect(fracToPct(NaN)).toBe('')
  })
})

describe('pctToFrac', () => {
  it('converte porcentagem digitada para fração', () => {
    expect(pctToFrac('8')).toBeCloseTo(0.08, 10)
    expect(pctToFrac('20')).toBeCloseTo(0.2, 10)
    expect(pctToFrac('4,5'.replace(',', '.'))).toBeCloseTo(0.045, 10)
  })

  it('campo vazio vira 0 (não NaN indo para o motor)', () => {
    expect(pctToFrac('')).toBe(0)
    expect(pctToFrac('   ')).toBe(0)
    expect(pctToFrac('abc')).toBe(0)
  })
})

describe('round-trip nas premissas padrão', () => {
  // O valor exibido, se reenviado sem edição, não pode alterar o default além
  // de erro desprezível — senão abrir "avançadas" e salvar corromperia o motor.
  const chaves = ['reajusteTarifaAnual', 'tma', 'impostoPct', 'opexPct', 'degradacaoAnual', 'd23', 'jurosAnual'] as const
  it.each(chaves)('%s sobrevive a fração → % → fração', (k) => {
    const original = PREMISSAS_DEFAULT[k] as number
    expect(pctToFrac(fracToPct(original))).toBeCloseTo(original, 8)
  })
})
