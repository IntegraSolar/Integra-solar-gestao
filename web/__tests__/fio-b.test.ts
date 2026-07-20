import { describe, it, expect } from 'vitest'
import { percentualFioB, fioBSchedule } from '@/lib/simuladores/fio-b'

describe('percentualFioB (Lei 14.300, por ano-calendário)', () => {
  it('antes de 2023 não havia cobrança de Fio B sobre a injeção', () => {
    expect(percentualFioB(2022)).toBe(0)
    expect(percentualFioB(2010)).toBe(0)
  })
  it('segue a escala legal de 2023 a 2028', () => {
    expect(percentualFioB(2023)).toBeCloseTo(0.15, 9)
    expect(percentualFioB(2024)).toBeCloseTo(0.30, 9)
    expect(percentualFioB(2025)).toBeCloseTo(0.45, 9)
    expect(percentualFioB(2026)).toBeCloseTo(0.60, 9)
    expect(percentualFioB(2027)).toBeCloseTo(0.75, 9)
    expect(percentualFioB(2028)).toBeCloseTo(0.90, 9)
  })
  it('é integral de 2029 em diante', () => {
    expect(percentualFioB(2029)).toBe(1)
    expect(percentualFioB(2040)).toBe(1)
  })
})

describe('fioBSchedule', () => {
  it('conexão em 2026 reproduz exatamente a escala fixa que existia antes', () => {
    // Esta é a prova de que a correção NÃO muda nada em 2026 — só a partir de 2027.
    expect(fioBSchedule(2026, 25)).toEqual([0.6, 0.75, 0.9, ...Array<number>(22).fill(1)])
  })
  it('conexão em 2027 começa em 75%', () => {
    expect(fioBSchedule(2027, 25).slice(0, 3)).toEqual([0.75, 0.9, 1])
  })
  it('conexão em 2025 começa em 45%', () => {
    expect(fioBSchedule(2025, 25).slice(0, 4)).toEqual([0.45, 0.6, 0.75, 0.9])
  })
  it('conexão de 2030 em diante é integral o tempo todo', () => {
    expect(fioBSchedule(2030, 25).every((v) => v === 1)).toBe(true)
  })
  it('devolve exatamente horizonteAnos elementos', () => {
    expect(fioBSchedule(2026, 25)).toHaveLength(25)
    expect(fioBSchedule(2026, 2)).toEqual([0.6, 0.75])
    expect(fioBSchedule(2026, 1)).toEqual([0.6])
  })
  it('horizonte zero ou negativo devolve lista vazia', () => {
    expect(fioBSchedule(2026, 0)).toEqual([])
    expect(fioBSchedule(2026, -3)).toEqual([])
  })
})
