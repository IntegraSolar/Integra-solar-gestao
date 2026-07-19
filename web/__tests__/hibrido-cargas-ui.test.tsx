// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { CargasResumo } from '@/components/simuladores/CargasResumo'
import { CargasCurva24h } from '@/components/simuladores/CargasCurva24h'
import { calcularCargas } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import type { Carga } from '@/lib/simuladores/hibrido/types'

const CARGA: Carga = {
  nome: 'Chuveiro', quantidade: 1, potenciaUnitW: 5500, potenciaPartidaW: 5500,
  tensaoV: 220, fatorPotencia: 1, horasDia: 0.5, diasSemana: 7,
  horaInicio: 19, horaFim: 19.5, critica: false,
}

describe('CargasResumo', () => {
  it('exibe o consumo diário calculado pelo motor', () => {
    const resumo = calcularCargas([CARGA], PREMISSAS_PADRAO)
    render(<CargasResumo resumo={resumo} />)
    // 5500 W × 0,5 h = 2750 Wh = 2,75 kWh/dia
    expect(screen.getByTestId('consumo-diario')).toHaveTextContent('2,75')
  })

  it('exibe o pico de demanda vindo da curva', () => {
    const resumo = calcularCargas([CARGA], PREMISSAS_PADRAO)
    render(<CargasResumo resumo={resumo} />)
    expect(screen.getByTestId('pico-demanda')).toHaveTextContent('5.500')
  })

  it('levantamento vazio mostra zeros sem quebrar', () => {
    const resumo = calcularCargas([], PREMISSAS_PADRAO)
    render(<CargasResumo resumo={resumo} />)
    expect(screen.getByTestId('consumo-diario')).toHaveTextContent('0')
  })
})

describe('CargasCurva24h', () => {
  // Escopo deliberado: apenas "monta sem quebrar". O ResponsiveContainer do
  // recharts mede largura zero em jsdom e não desenha as barras, então afirmar
  // sobre o desenho daria atrito alto e valor quase nulo — a correção da curva
  // já está coberta pelos testes puros de calcularCargas (Fase 2a).
  it('monta com uma curva preenchida', () => {
    const curva = new Array(24).fill(0)
    curva[19] = 5795
    render(<CargasCurva24h curva={curva} />)
    expect(screen.getByTestId('curva-24h')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há carga', () => {
    render(<CargasCurva24h curva={new Array(24).fill(0)} />)
    expect(screen.getByText(/Nenhuma carga no levantamento/)).toBeInTheDocument()
  })
})
