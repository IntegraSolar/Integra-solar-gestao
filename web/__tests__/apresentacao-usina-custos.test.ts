import { describe, it, expect } from 'vitest'
import { custosProjeto } from '@/lib/apresentacoes-usina/custos'
import type { ViabilidadeInput } from '@/lib/simuladores/viabilidade/types'

const inputBase = { valorInvestimento: 154413.82, horizonteAnos: 25 } as ViabilidadeInput

describe('custosProjeto', () => {
  it('reproduz CAPEX, reestruturação do inversor e vida útil da planilha', () => {
    const linhas = custosProjeto(inputBase)
    const capex = linhas.find((l) => l.rotulo.includes('CAPEX'))
    const reest = linhas.find((l) => l.rotulo.includes('Reestruturação'))
    const vida = linhas.find((l) => l.rotulo.includes('Vida útil'))
    expect(capex?.valor).toBe('-R$ 154.413,82')
    expect(reest?.valor).toBe('-R$ 20.782,07')
    expect(vida?.valor).toBe('25 anos')
  })

  it('NÃO inclui O&M Acumulado nem Total (não reproduzíveis pelo motor)', () => {
    const linhas = custosProjeto(inputBase)
    expect(linhas.some((l) => l.rotulo.includes('O&M'))).toBe(false)
    expect(linhas.some((l) => l.rotulo === 'Total')).toBe(false)
  })
})
