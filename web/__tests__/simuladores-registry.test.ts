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
  it('viabilidade-usina e parcelamento-cartao disponíveis; hibrido-offgrid em construção; demais em_breve', () => {
    expect(getSimulador('viabilidade-usina')?.status).toBe('disponivel')
    expect(getSimulador('parcelamento-cartao')?.status).toBe('disponivel')
    expect(getSimulador('hibrido-offgrid')?.status).toBe('em_construcao')
    const naoEmBreve = ['viabilidade-usina', 'parcelamento-cartao', 'hibrido-offgrid']
    expect(SIMULADORES.filter(s => !naoEmBreve.includes(s.slug)).every(s => s.status === 'em_breve')).toBe(true)
  })
  it('getSimulador acha por slug e retorna undefined para inexistente', () => {
    expect(getSimulador('financiamento')?.titulo).toBe('Financiamento')
    expect(getSimulador('nao-existe')).toBeUndefined()
  })
})
