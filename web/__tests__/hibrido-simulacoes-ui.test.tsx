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
  salvarSimulacaoHibrido: vi.fn(async () => ({ success: 'Simulação salva.' })),
  deleteSimulacaoHibrido: vi.fn(async () => ({ success: 'Simulação excluída.' })),
}))

function IdentComEstado() {
  const [ident, setIdent] = useState<DadosProjeto>(DADOS_PROJETO_INICIAL)
  return <HibridoIdentificacao dados={ident} onChange={setIdent} />
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

import { HibridoSimulacoesSalvas } from '@/components/simuladores/HibridoSimulacoesSalvas'
import type { SimulacaoResumo } from '@/lib/simuladores/hibrido/simulacoes-schemas'

const SIM: SimulacaoResumo = {
  id: 's1', nome: 'Projeto Palmas', clienteNome: 'Iago', clienteCidade: 'Palmas',
  potenciaKwp: 9.92, investimentoTotal: 89681.35, vpl: 141864.78, tir: 0.1848,
  paybackAnos: 6.61, createdAt: '2026-07-19T12:00:00Z',
}

const SEM_PAYBACK: SimulacaoResumo = { ...SIM, id: 's2', nome: 'Sem retorno', paybackAnos: null }

describe('HibridoSimulacoesSalvas', () => {
  it('não renderiza nada quando a lista está vazia', () => {
    const { container } = render(
      <HibridoSimulacoesSalvas simulacoes={[]} onReabrir={vi.fn()} onExcluir={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lista as simulações com nome e cliente', () => {
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={vi.fn()} onExcluir={vi.fn()} />)
    expect(screen.getByText('Projeto Palmas')).toBeInTheDocument()
    expect(screen.getByText('Iago')).toBeInTheDocument()
  })

  it('payback null aparece como "não se paga", nunca como zero', () => {
    render(<HibridoSimulacoesSalvas simulacoes={[SEM_PAYBACK]} onReabrir={vi.fn()} onExcluir={vi.fn()} />)
    const celula = screen.getByTestId('sim-payback-s2')
    expect(celula).toHaveTextContent('não se paga')
    expect(celula).not.toHaveTextContent('0')
  })

  it('payback preenchido aparece em anos', () => {
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={vi.fn()} onExcluir={vi.fn()} />)
    expect(screen.getByTestId('sim-payback-s1')).toHaveTextContent('6,6')
  })

  it('reabrir chama o callback com o id', async () => {
    const user = userEvent.setup()
    const onReabrir = vi.fn()
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={onReabrir} onExcluir={vi.fn()} />)
    await user.click(screen.getByTestId('btn-reabrir-s1'))
    expect(onReabrir).toHaveBeenCalledWith('s1')
  })

  it('excluir chama o callback com o id', async () => {
    const user = userEvent.setup()
    const onExcluir = vi.fn()
    render(<HibridoSimulacoesSalvas simulacoes={[SIM]} onReabrir={vi.fn()} onExcluir={onExcluir} />)
    await user.click(screen.getByTestId('btn-excluir-s1'))
    expect(onExcluir).toHaveBeenCalledWith('s1')
  })
})

import { SimuladorHibrido } from '@/components/simuladores/SimuladorHibrido'
import {
  salvarSimulacaoHibrido, getSimulacaoHibrido,
} from '@/lib/simuladores/hibrido/simulacoes-actions'
import { montarSnapshot } from '@/lib/simuladores/hibrido/snapshot'
import { CAMPOS_INICIAIS } from '@/lib/simuladores/hibrido/montar-input'
import { camposFinanceiroIniciais } from '@/lib/simuladores/hibrido/montar-financeiro'
import { PAINEL, INVERSOR, BATERIA, CARGAS } from './fixtures/hibrido-fixture'

const EQUIP_UI = { paineis: [PAINEL], inversores: [INVERSOR], baterias: [BATERIA] }

describe('SimuladorHibrido — salvar e reabrir', () => {
  it('salvar envia o nome, o resumo e o snapshot', async () => {
    const user = userEvent.setup()
    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[]} empresa={{ nome: 'Empresa Teste', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }} />)

    await user.type(screen.getByTestId('ident-nome'), 'Projeto Palmas')
    await user.selectOptions(screen.getByTestId('sel-painel'), PAINEL.id)
    await user.click(screen.getByTestId('btn-salvar-simulacao'))

    expect(salvarSimulacaoHibrido).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Projeto Palmas',
        snapshot: expect.objectContaining({ versao: 1 }),
        potenciaKwp: expect.any(Number),
      })
    )
  })

  it('reabrir pede confirmação; cancelar não muda nada', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[SIM]} empresa={{ nome: 'Empresa Teste', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }} />)

    await user.click(screen.getByTestId('btn-reabrir-s1'))
    expect(confirmSpy).toHaveBeenCalled()
    expect(getSimulacaoHibrido).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('ao confirmar, restaura campos, cargas e identificação', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    const snapshot = montarSnapshot(
      { ...CAMPOS_INICIAIS, tempMediaC: 27, painelId: PAINEL.id, numModulos: '16' },
      { ...camposFinanceiroIniciais(2026), tarifaKwh: '1.22' },
      CARGAS,
      { painel: PAINEL, inversor: INVERSOR, bateria: BATERIA }
    )
    vi.mocked(getSimulacaoHibrido).mockResolvedValueOnce({
      ...SIM, clienteUf: 'TO', concessionaria: 'ENERGISA',
      responsavelTecnico: 'Patrick', snapshot,
      azimute: null, inclinacao: null, latitude: null, longitude: null,
      altitude: null, tipoLigacao: null, tensaoNominal: null, modoOperacao: null,
    })

    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[SIM]} empresa={{ nome: 'Empresa Teste', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }} />)
    await user.click(screen.getByTestId('btn-reabrir-s1'))

    expect(await screen.findByDisplayValue('Projeto Palmas')).toBeInTheDocument()
    expect(screen.getByTestId('temp-media')).toHaveValue(27)
    expect(screen.getByTestId('ident-clienteNome')).toHaveValue('Iago')
    expect(screen.getByTestId('fin-tarifaKwh')).toHaveValue('1.22')
    confirmSpy.mockRestore()
  })

  it('snapshot inválido mostra erro e não altera a tela', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(getSimulacaoHibrido).mockResolvedValueOnce({
      ...SIM, clienteUf: null, concessionaria: null, responsavelTecnico: null,
      snapshot: { versao: 99 },
      azimute: null, inclinacao: null, latitude: null, longitude: null,
      altitude: null, tipoLigacao: null, tensaoNominal: null, modoOperacao: null,
    })

    render(<SimuladorHibrido equipamentos={EQUIP_UI} biblioteca={[]} simulacoes={[SIM]} empresa={{ nome: 'Empresa Teste', cnpj: null, endereco: null, telefone: null, email: null, logoBase64: null }} />)
    const antes = (screen.getByTestId('temp-media') as HTMLInputElement).value
    await user.click(screen.getByTestId('btn-reabrir-s1'))

    expect(await screen.findByTestId('erro-simulacao')).toBeInTheDocument()
    expect((screen.getByTestId('temp-media') as HTMLInputElement).value).toBe(antes)
    confirmSpy.mockRestore()
  })
})
