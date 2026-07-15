import { describe, it, expect } from 'vitest'
import { SIMULADORES, getSimulador } from '@/lib/simuladores/registry'

describe('registry de simuladores', () => {
  it('tem os 6 simuladores previstos', () => {
    expect(SIMULADORES).toHaveLength(6)
  })
  it('todos os slugs são únicos', () => {
    const slugs = SIMULADORES.map(s => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('na fundação todos nascem como "em_breve"', () => {
    expect(SIMULADORES.every(s => s.status === 'em_breve')).toBe(true)
  })
  it('getSimulador acha por slug e retorna undefined para inexistente', () => {
    expect(getSimulador('financiamento')?.titulo).toBe('Financiamento')
    expect(getSimulador('nao-existe')).toBeUndefined()
  })
})
