// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  HibridoIdentificacao, IDENTIFICACAO_INICIAL, type Identificacao,
} from '@/components/simuladores/HibridoIdentificacao'

vi.mock('@/lib/simuladores/hibrido/simulacoes-actions', () => ({
  listSimulacoesHibrido: vi.fn(async () => []),
  getSimulacaoHibrido: vi.fn(async () => null),
  salvarSimulacaoHibrido: vi.fn(async () => ({ success: 'Simulação salva.' })),
  deleteSimulacaoHibrido: vi.fn(async () => ({ success: 'Simulação excluída.' })),
}))

function IdentComEstado() {
  const [ident, setIdent] = useState<Identificacao>(IDENTIFICACAO_INICIAL)
  return <HibridoIdentificacao identificacao={ident} onChange={setIdent} />
}

describe('HibridoIdentificacao', () => {
  it('começa com todos os campos vazios', () => {
    render(<IdentComEstado />)
    expect(screen.getByTestId('ident-nome')).toHaveValue('')
    expect(screen.getByTestId('ident-clienteNome')).toHaveValue('')
  })

  it('editar o nome da simulação propaga', async () => {
    const user = userEvent.setup()
    render(<IdentComEstado />)
    await user.type(screen.getByTestId('ident-nome'), 'Projeto Palmas')
    expect(screen.getByTestId('ident-nome')).toHaveValue('Projeto Palmas')
  })

  it('tem os campos de cliente, cidade, UF, concessionária e responsável', () => {
    render(<IdentComEstado />)
    expect(screen.getByTestId('ident-clienteCidade')).toBeInTheDocument()
    expect(screen.getByTestId('ident-clienteUf')).toBeInTheDocument()
    expect(screen.getByTestId('ident-concessionaria')).toBeInTheDocument()
    expect(screen.getByTestId('ident-responsavelTecnico')).toBeInTheDocument()
  })
})
