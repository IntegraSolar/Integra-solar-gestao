// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HibridoInputsProjeto } from '@/components/simuladores/HibridoInputsProjeto'
import { CAMPOS_INICIAIS, type CamposHibrido } from '@/lib/simuladores/hibrido/montar-input'

const LINHA_HSP = '4,75 4,71 4,70 5,16 5,56 5,69 5,82 5,91 5,71 5,42 4,96 4,78'

function ProjetoComEstado({ inicial = CAMPOS_INICIAIS }: { inicial?: CamposHibrido }) {
  const [campos, setCampos] = useState<CamposHibrido>(inicial)
  return <HibridoInputsProjeto campos={campos} onChange={setCampos} />
}

describe('HibridoInputsProjeto', () => {
  it('renderiza os 12 campos de HSP', () => {
    render(<ProjetoComEstado />)
    for (let i = 0; i < 12; i++) {
      expect(screen.getByTestId(`hsp-${i}`)).toBeInTheDocument()
    }
  })

  it('colar 12 valores preenche todos os campos', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    await user.type(screen.getByTestId('hsp-colar'), LINHA_HSP)
    await user.click(screen.getByTestId('btn-aplicar-hsp'))
    expect(screen.getByTestId('hsp-0')).toHaveValue(4.75)
    expect(screen.getByTestId('hsp-2')).toHaveValue(4.7)
    expect(screen.getByTestId('hsp-11')).toHaveValue(4.78)
  })

  it('colagem inválida avisa e NÃO altera os valores existentes', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    const antes = (screen.getByTestId('hsp-0') as HTMLInputElement).value
    await user.type(screen.getByTestId('hsp-colar'), '1 2 3')
    await user.click(screen.getByTestId('btn-aplicar-hsp'))
    expect(screen.getByTestId('erro-hsp')).toBeInTheDocument()
    expect((screen.getByTestId('hsp-0') as HTMLInputElement).value).toBe(antes)
  })

  it('editar uma temperatura propaga a mudança', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    await user.clear(screen.getByTestId('temp-media'))
    await user.type(screen.getByTestId('temp-media'), '27')
    expect(screen.getByTestId('temp-media')).toHaveValue(27)
  })

  it('permite trocar o critério de geração', async () => {
    const user = userEvent.setup()
    render(<ProjetoComEstado />)
    await user.selectOptions(screen.getByTestId('criterio-geracao'), 'media_anual')
    expect(screen.getByTestId('criterio-geracao')).toHaveValue('media_anual')
  })
})

import { HibridoSelecaoEquipamentos } from '@/components/simuladores/HibridoSelecaoEquipamentos'
import type { EquipamentosDisponiveis } from '@/lib/simuladores/hibrido/montar-input'
import { PAINEL, INVERSOR, BATERIA } from './fixtures/hibrido-fixture'

const EQUIP: EquipamentosDisponiveis = {
  paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA],
}
const VAZIO: EquipamentosDisponiveis = { paineis: [], inversores: [], baterias: [] }

function SelecaoComEstado({ equipamentos = EQUIP }: { equipamentos?: EquipamentosDisponiveis }) {
  const [campos, setCampos] = useState<CamposHibrido>(CAMPOS_INICIAIS)
  return <HibridoSelecaoEquipamentos campos={campos} equipamentos={equipamentos} onChange={setCampos} />
}

describe('HibridoSelecaoEquipamentos', () => {
  it('lista os equipamentos cadastrados', () => {
    render(<SelecaoComEstado />)
    expect(screen.getByTestId('sel-painel')).toBeInTheDocument()
    expect(screen.getByText(/OSDA MHDRZ/)).toBeInTheDocument()
  })

  it('escolher um painel guarda o id', async () => {
    const user = userEvent.setup()
    render(<SelecaoComEstado />)
    await user.selectOptions(screen.getByTestId('sel-painel'), PAINEL.id)
    expect(screen.getByTestId('sel-painel')).toHaveValue(PAINEL.id)
  })

  it('começa sem nada selecionado', () => {
    render(<SelecaoComEstado />)
    expect(screen.getByTestId('sel-painel')).toHaveValue('')
  })

  it('sem equipamentos cadastrados mostra aviso com link para o cadastro', () => {
    render(<SelecaoComEstado equipamentos={VAZIO} />)
    const aviso = screen.getByTestId('aviso-sem-equipamentos')
    expect(aviso).toBeInTheDocument()
    expect(aviso.querySelector('a')).toHaveAttribute('href', '/simuladores/hibrido-offgrid/equipamentos')
  })
})
