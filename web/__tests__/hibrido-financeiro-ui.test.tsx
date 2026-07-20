// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HibridoInputsFinanceiro } from '@/components/simuladores/HibridoInputsFinanceiro'
import {
  camposFinanceiroIniciais, type CamposFinanceiro,
} from '@/lib/simuladores/hibrido/montar-financeiro'
import { PRECOS_CAPEX_PADRAO } from '@/lib/simuladores/hibrido/premissas'

function FinanceiroComEstado() {
  const [campos, setCampos] = useState<CamposFinanceiro>(camposFinanceiroIniciais(2026))
  return <HibridoInputsFinanceiro campos={campos} onChange={setCampos} />
}

describe('HibridoInputsFinanceiro', () => {
  it('tarifas começam vazias', () => {
    render(<FinanceiroComEstado />)
    expect(screen.getByTestId('fin-tarifaKwh')).toHaveValue('')
    expect(screen.getByTestId('fin-tusdFioBKwh')).toHaveValue('')
  })

  it('preços vêm pré-preenchidos com os padrões', () => {
    render(<FinanceiroComEstado />)
    expect(screen.getByTestId('fin-moduloUnitario')).toHaveValue(String(PRECOS_CAPEX_PADRAO.moduloUnitario))
    expect(screen.getByTestId('fin-bateriaUnitaria')).toHaveValue(String(PRECOS_CAPEX_PADRAO.bateriaUnitaria))
  })

  it('editar a tarifa propaga a mudança', async () => {
    const user = userEvent.setup()
    render(<FinanceiroComEstado />)
    await user.type(screen.getByTestId('fin-tarifaKwh'), '1.22')
    expect(screen.getByTestId('fin-tarifaKwh')).toHaveValue('1.22')
  })

  it('editar um preço propaga a mudança', async () => {
    const user = userEvent.setup()
    render(<FinanceiroComEstado />)
    await user.clear(screen.getByTestId('fin-moduloUnitario'))
    await user.type(screen.getByTestId('fin-moduloUnitario'), '900')
    expect(screen.getByTestId('fin-moduloUnitario')).toHaveValue('900')
  })

  it('ano de conexão vem preenchido e não aceita antes de 2023', () => {
    render(<FinanceiroComEstado />)
    const ano = screen.getByTestId('fin-anoConexao')
    expect(ano).toHaveValue(2026)
    expect(ano).toHaveAttribute('min', '2023')
  })
})

import { HibridoResultadosCapex } from '@/components/simuladores/HibridoResultadosCapex'
import { calcularFinanceiro } from '@/lib/simuladores/hibrido/financeiro'
import type { FisicoParaFinanceiro } from '@/lib/simuladores/hibrido/types'

const FISICO_TESTE: FisicoParaFinanceiro = {
  numModulos: 16, numInversores: 1, numBaterias: 2,
  potenciaInstaladaKwp: 9.92, producaoAnualKwh: 14149.415366185884, consumoAnualKwh: 2135.25,
}

const TARIFAS_TESTE = { tarifaKwh: 1.22, tusdFioBKwh: 0.36, disponibilidadeKwhMes: 100 }

describe('HibridoResultadosCapex', () => {
  const r = calcularFinanceiro({ fisico: FISICO_TESTE, tarifas: TARIFAS_TESTE })

  it('lista os 8 itens do CAPEX', () => {
    render(<HibridoResultadosCapex capex={r.capex} />)
    expect(screen.getAllByTestId(/^capex-item-/)).toHaveLength(8)
  })

  it('a soma dos subtotais exibidos confere com o custo direto', () => {
    render(<HibridoResultadosCapex capex={r.capex} />)
    const soma = r.capex.itens.reduce((a, i) => a + i.subtotal, 0)
    expect(soma).toBeCloseTo(r.capex.custoDireto, 6)
    expect(screen.getByTestId('capex-custo-direto')).toHaveTextContent(
      r.capex.custoDireto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  })

  it('mostra o investimento total do motor', () => {
    render(<HibridoResultadosCapex capex={r.capex} />)
    expect(screen.getByTestId('capex-investimento-total')).toHaveTextContent(
      r.capex.investimentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  })
})
