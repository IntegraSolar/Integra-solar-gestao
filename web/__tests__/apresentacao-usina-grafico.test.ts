import { describe, it, expect } from 'vitest'
import { svgFluxoAcumulado } from '@/lib/apresentacoes-usina/grafico'

describe('svgFluxoAcumulado', () => {
  it('gera um SVG com um ponto por ano da série', () => {
    const svg = svgFluxoAcumulado([-100, -60, -20, 30, 80])
    expect(svg.startsWith('<svg')).toBe(true)
    const pontos = svg.match(/points="([^"]+)"/)?.[1].trim().split(/\s+/) ?? []
    expect(pontos.length).toBe(5)
  })

  it('série vazia não quebra', () => {
    expect(svgFluxoAcumulado([]).startsWith('<svg')).toBe(true)
  })
})
