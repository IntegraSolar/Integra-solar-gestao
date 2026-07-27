import { describe, it, expect } from 'vitest'
import { svgFluxoAcumulado } from '@/lib/apresentacoes-usina/grafico'

const serie = (valores: number[]) => valores.map((valor, i) => ({ ano: 2026 + i, valor }))

describe('svgFluxoAcumulado', () => {
  it('a polyline tem um vértice por ano da série', () => {
    const svg = svgFluxoAcumulado(serie([-100, -60, -20, 30, 80]))
    expect(svg.startsWith('<svg')).toBe(true)
    // A polyline principal é a primeira ocorrência de points="..." em <polyline>.
    const linha = svg.match(/<polyline[^>]*points="([^"]+)"/)?.[1].trim().split(/\s+/) ?? []
    expect(linha.length).toBe(5)
  })

  it('marca o ano em que o fluxo vira positivo (primeiro acumulado não-negativo)', () => {
    // Série cruza o zero no índice 3 → ano 2029.
    const svg = svgFluxoAcumulado(serie([-100, -60, -20, 30, 80]))
    expect(svg).toContain('Fluxo positivo 2029')
  })

  it('mostra os anos inicial e final no eixo X', () => {
    const svg = svgFluxoAcumulado(serie([-100, -60, -20, 30, 80]))
    expect(svg).toContain('>2026<')
    expect(svg).toContain('>2030<')
  })

  it('rotula o valor final acumulado', () => {
    const svg = svgFluxoAcumulado(serie([-100000, 50000, 250000]))
    expect(svg).toContain('R$ 250 mil')
  })

  it('série que nunca vira positiva não desenha o marcador de virada', () => {
    const svg = svgFluxoAcumulado(serie([-100, -80, -60]))
    expect(svg).not.toContain('Fluxo positivo')
  })

  it('série vazia não quebra', () => {
    expect(svgFluxoAcumulado([]).startsWith('<svg')).toBe(true)
  })
})
