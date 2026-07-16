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
  it('viabilidade-usina está disponível e os demais em_breve', () => {
    expect(getSimulador('viabilidade-usina')?.status).toBe('disponivel')
    expect(SIMULADORES.filter(s => s.slug !== 'viabilidade-usina').every(s => s.status === 'em_breve')).toBe(true)
  })
  it('getSimulador acha por slug e retorna undefined para inexistente', () => {
    expect(getSimulador('financiamento')?.titulo).toBe('Financiamento')
    expect(getSimulador('nao-existe')).toBeUndefined()
  })
})
