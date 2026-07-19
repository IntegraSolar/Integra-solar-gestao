// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { CargasResumo } from '@/components/simuladores/CargasResumo'
import { CargasCurva24h } from '@/components/simuladores/CargasCurva24h'
import { calcularCargas } from '@/lib/simuladores/hibrido/cargas'
import { PREMISSAS_PADRAO } from '@/lib/simuladores/hibrido/premissas'
import type { Carga } from '@/lib/simuladores/hibrido/types'

vi.mock('@/lib/simuladores/hibrido/cargas-biblioteca-actions', () => ({
  listCargasBiblioteca: vi.fn(async () => []),
  createCargaBiblioteca: vi.fn(async () => ({ success: 'Carga adicionada.' })),
  updateCargaBiblioteca: vi.fn(async () => ({ success: 'Carga atualizada.' })),
  deleteCargaBiblioteca: vi.fn(async () => ({ success: 'Carga excluída.' })),
}))

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

import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { CargasTabela } from '@/components/simuladores/CargasTabela'
import type { CargaBiblioteca } from '@/lib/simuladores/hibrido/cargas-biblioteca-schemas'

const MODELO: CargaBiblioteca = {
  id: 'b1', nome: 'Geladeira duplex', categoria: 'Refrigeração',
  potenciaUnitW: 150, potenciaPartidaW: 600, tensaoV: 220, fatorPotencia: 0.85,
  horasDia: 10, diasSemana: 7, horaInicio: 0, horaFim: 24,
  prioridade: 'Alta', critica: true,
}

/** Envoltório com estado, já que CargasTabela é controlado. */
function TabelaComEstado({ inicial = [] as Carga[] }) {
  const [cargas, setCargas] = useState<Carga[]>(inicial)
  return <CargasTabela cargas={cargas} biblioteca={[MODELO]} onChange={setCargas} />
}

describe('CargasTabela', () => {
  it('começa vazia com uma mensagem', () => {
    render(<TabelaComEstado />)
    expect(screen.getByText(/Nenhuma carga adicionada/)).toBeInTheDocument()
  })

  it('adicionar da biblioteca preenche os campos do modelo', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.selectOptions(screen.getByTestId('select-biblioteca'), 'b1')
    await user.click(screen.getByTestId('btn-add-biblioteca'))
    expect(screen.getByTestId('nome-0')).toHaveValue('Geladeira duplex')
    expect(screen.getByTestId('qtd-0')).toHaveValue(1)
    expect(screen.getByTestId('pot-0')).toHaveValue(150)
  })

  it('alterar a quantidade atualiza o consumo exibido na linha', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.selectOptions(screen.getByTestId('select-biblioteca'), 'b1')
    await user.click(screen.getByTestId('btn-add-biblioteca'))
    // 1 × 150 W × 10 h = 1500 Wh
    expect(screen.getByTestId('consumo-linha-0')).toHaveTextContent('1.500')
    await user.clear(screen.getByTestId('qtd-0'))
    await user.type(screen.getByTestId('qtd-0'), '2')
    // 2 × 150 W × 10 h = 3000 Wh
    expect(screen.getByTestId('consumo-linha-0')).toHaveTextContent('3.000')
  })

  it('adicionar em branco cria uma linha editável', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.click(screen.getByTestId('btn-add-branco'))
    expect(screen.getByTestId('qtd-0')).toBeInTheDocument()
  })

  it('remover tira a linha da lista', async () => {
    const user = userEvent.setup()
    render(<TabelaComEstado />)
    await user.click(screen.getByTestId('btn-add-branco'))
    expect(screen.getByTestId('qtd-0')).toBeInTheDocument()
    await user.click(screen.getByTestId('btn-remover-0'))
    expect(screen.queryByTestId('qtd-0')).not.toBeInTheDocument()
    expect(screen.getByText(/Nenhuma carga adicionada/)).toBeInTheDocument()
  })
})

import { BibliotecaCargasPanel } from '@/components/simuladores/BibliotecaCargasPanel'
import {
  createCargaBiblioteca, deleteCargaBiblioteca,
} from '@/lib/simuladores/hibrido/cargas-biblioteca-actions'

function PainelComEstado({ inicial = [] as CargaBiblioteca[] }) {
  const [biblioteca, setBiblioteca] = useState<CargaBiblioteca[]>(inicial)
  return <BibliotecaCargasPanel biblioteca={biblioteca} onBibliotecaChange={setBiblioteca} />
}

describe('BibliotecaCargasPanel', () => {
  it('começa recolhido e abre ao clicar', async () => {
    const user = userEvent.setup()
    render(<PainelComEstado inicial={[MODELO]} />)
    expect(screen.queryByTestId('bib-nome')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    expect(screen.getByTestId('bib-nome')).toBeInTheDocument()
  })

  it('lista os modelos existentes', async () => {
    const user = userEvent.setup()
    render(<PainelComEstado inicial={[MODELO]} />)
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    expect(screen.getByText('Geladeira duplex')).toBeInTheDocument()
  })

  it('criar chama a action com os dados do formulário', async () => {
    const user = userEvent.setup()
    render(<PainelComEstado inicial={[]} />)
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    await user.type(screen.getByTestId('bib-nome'), 'Bomba nova')
    await user.clear(screen.getByTestId('bib-pot'))
    await user.type(screen.getByTestId('bib-pot'), '750')
    await user.clear(screen.getByTestId('bib-partida'))
    await user.type(screen.getByTestId('bib-partida'), '3000')
    await user.click(screen.getByTestId('btn-salvar-biblioteca'))
    expect(createCargaBiblioteca).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Bomba nova', potenciaUnitW: 750, potenciaPartidaW: 3000 })
    )
  })

  it('excluir chama a action com o id', async () => {
    const user = userEvent.setup()
    render(<PainelComEstado inicial={[MODELO]} />)
    await user.click(screen.getByTestId('btn-toggle-biblioteca'))
    await user.click(screen.getByTestId('btn-excluir-b1'))
    expect(deleteCargaBiblioteca).toHaveBeenCalledWith('b1')
  })
})
