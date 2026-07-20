// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  HibridoIdentificacao, DADOS_PROJETO_INICIAL, type DadosProjeto,
} from '@/components/simuladores/HibridoIdentificacao'

vi.mock('@/lib/simuladores/hibrido/simulacoes-actions', () => ({
  listSimulacoesHibrido: vi.fn(async () => []),
  getSimulacaoHibrido: vi.fn(async () => null),
  salvarSimulacaoHibrido: vi.fn(async () => ({ success: 'ok' })),
  deleteSimulacaoHibrido: vi.fn(async () => ({ success: 'ok' })),
}))

function ComEstado() {
  const [dados, setDados] = useState<DadosProjeto>(DADOS_PROJETO_INICIAL)
  return <HibridoIdentificacao dados={dados} onChange={setDados} />
}

describe('HibridoIdentificacao — identificação', () => {
  it('mantém os campos de identificação da fase anterior', () => {
    render(<ComEstado />)
    expect(screen.getByTestId('ident-nome')).toBeInTheDocument()
    expect(screen.getByTestId('ident-clienteNome')).toBeInTheDocument()
    expect(screen.getByTestId('ident-concessionaria')).toBeInTheDocument()
    expect(screen.getByTestId('ident-responsavelTecnico')).toBeInTheDocument()
  })
})

describe('HibridoIdentificacao — dados do projeto', () => {
  it('tem os oito campos descritivos que o memorial exige', () => {
    render(<ComEstado />)
    for (const k of [
      'azimute', 'inclinacao', 'latitude', 'longitude', 'altitude',
      'tipoLigacao', 'tensaoNominal', 'modoOperacao',
    ]) {
      expect(screen.getByTestId(`ident-${k}`), k).toBeInTheDocument()
    }
  })

  it('todos começam vazios (não informado)', () => {
    render(<ComEstado />)
    expect(screen.getByTestId('ident-azimute')).toHaveValue('')
    expect(screen.getByTestId('ident-latitude')).toHaveValue('')
  })

  it('editar um descritivo propaga', async () => {
    const user = userEvent.setup()
    render(<ComEstado />)
    await user.type(screen.getByTestId('ident-inclinacao'), '15')
    expect(screen.getByTestId('ident-inclinacao')).toHaveValue('15')
  })

  it('tipo de ligação é uma escolha, não texto livre', async () => {
    const user = userEvent.setup()
    render(<ComEstado />)
    await user.selectOptions(screen.getByTestId('ident-tipoLigacao'), 'Trifásico')
    expect(screen.getByTestId('ident-tipoLigacao')).toHaveValue('Trifásico')
  })
})
